'use client'

import { useEffect, useRef, useState } from 'react'
// NOTE: import from the package root, not 'scorm-again/scorm12'. The subpath's
// .d.ts declares `export default Scorm12API`, but its ESM bundle only has a
// NAMED export — so the default resolves to undefined at runtime while tsc stays
// happy. The root entry's types and runtime agree (both named).
import { Scorm12API } from 'scorm-again'

const LAUNCH_URL = '/training-content/scorm-v1/scormdriver/indexAPI.html'

/**
 * SCORM 1.2 receiver for the embedded Rise course.
 *
 * The course is a self-contained SCORM 1.2 package served from /public. Its
 * driver (Rustici scormdriver.js) discovers the LMS by walking
 * self → parent → top → opener looking for a `window.API` object. We are the
 * parent frame, so we instantiate scorm-again's Scorm12API, hang it on
 * `window.API`, and only THEN mount the iframe — if the iframe loads first the
 * driver finds no API and reports "LMS not found".
 *
 * Completion signal: the package's __DRIVER_CONFIG__ declares
 * `"reporting":"passed-incomplete"`, so on completion it sets
 * `cmi.core.lesson_status` to **"passed"**, not "completed". We accept either.
 *
 * scorm-again defaults `autocommit:false` and `lmsCommitUrl:false`, so it makes
 * no network calls of its own — every request to our API is made explicitly here.
 */

declare global {
  interface Window {
    API?: Scorm12API
  }
}

const COMPLETE_STATUSES = new Set(['completed', 'passed'])

interface Props {
  /** Fired once, after the completion event has been durably recorded server-side. */
  onCompleted?: () => void
  onStarted?: () => void
  className?: string
}

async function postProgress(event: 'started' | 'completed'): Promise<boolean> {
  try {
    const res = await fetch('/api/training/content-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    })
    if (!res.ok) {
      console.error('[scorm] content-progress rejected:', event, res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('[scorm] content-progress failed:', event, err)
    return false
  }
}

export function ScormContent({ onCompleted, onStarted, className }: Props) {
  // Gate the iframe until window.API exists.
  const [apiReady, setApiReady] = useState(false)

  // Fire-once guards. Refs (not state) so a re-render can never replay them, and
  // so the listener closures always read the current value.
  const startedRef = useRef(false)
  const completedRef = useRef(false)

  // Keep the latest callbacks reachable from listeners registered once on mount.
  const onCompletedRef = useRef(onCompleted)
  const onStartedRef = useRef(onStarted)
  useEffect(() => { onCompletedRef.current = onCompleted }, [onCompleted])
  useEffect(() => { onStartedRef.current = onStarted }, [onStarted])

  useEffect(() => {
    const api = new Scorm12API({
      autocommit: false,
      lmsCommitUrl: false,
      logLevel: 'ERROR', // keep the console clean
    })

    api.on('LMSInitialize', () => {
      if (startedRef.current) return
      startedRef.current = true
      void postProgress('started').then(ok => {
        if (ok) onStartedRef.current?.()
      })
    })

    api.on('LMSSetValue.cmi.core.lesson_status', (_cmiElement: string, value: string) => {
      if (!COMPLETE_STATUSES.has(String(value).toLowerCase())) return
      if (completedRef.current) return
      completedRef.current = true

      // Only tell the parent once the row is actually written — it re-renders the
      // server component to re-evaluate the gate, and would otherwise race the insert.
      void postProgress('completed').then(ok => {
        if (ok) onCompletedRef.current?.()
        else completedRef.current = false // allow a later retry
      })
    })

    window.API = api
    setApiReady(true)

    return () => {
      if (window.API === api) delete window.API
      setApiReady(false)
    }
  }, [])

  return (
    <div className={className}>
      <div className="relative w-full h-[75vh] min-h-[560px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {apiReady ? (
          <iframe
            title="AI Staff Compliance Certificate — course content"
            src={LAUNCH_URL}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Loading course…</p>
          </div>
        )}
      </div>
    </div>
  )
}
