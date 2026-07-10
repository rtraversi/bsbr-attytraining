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

const DEFAULT_FRAME =
  'relative h-[75vh] min-h-[560px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900'

interface Props {
  /** Fired once, after the completion event has been durably recorded server-side. */
  onCompleted?: () => void
  onStarted?: () => void
  className?: string
  /** Classes for the iframe's positioned container. Lets the caller resize it (e.g. focus mode). */
  frameClassName?: string
  /**
   * SCORM `cmi.core.lesson_location` to resume into (from the learner's last
   * recorded lesson boundary). Seeded before the iframe mounts so Rise drops
   * them back into the right lesson instead of restarting from the top.
   */
  initialLocation?: string
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

/** Fire-and-forget POST for the high-frequency telemetry events (location, time). */
function postContentEvent(body: Record<string, unknown>): void {
  void fetch('/api/training/content-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(err => console.error('[scorm] content-progress failed:', body.event, err))
}

/** SCORM 1.2 CMITimespan "HHHH:MM:SS.ss" → seconds, or null if unparseable. */
function parseScormTime(value: string): number | null {
  const m = /^(\d{2,4}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value.trim())
  if (!m) return null
  const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
  return Number.isFinite(seconds) ? seconds : null
}

export function ScormContent({
  onCompleted,
  onStarted,
  className,
  frameClassName,
  initialLocation,
}: Props) {
  // Gate the iframe until window.API exists.
  const [apiReady, setApiReady] = useState(false)

  // Fire-once guards. Refs (not state) so a re-render can never replay them, and
  // so the listener closures always read the current value.
  const startedRef = useRef(false)
  const completedRef = useRef(false)

  // Last cmi.core.session_time we saw this mount, in seconds — we post the delta
  // between ticks, not the absolute. Captured in a ref so the once-registered
  // listener reads the current value.
  const lastSecondsRef = useRef(0)

  // Mount-time resume bookmark. A ref so the effect's [] deps stay honest — this
  // is a server-provided constant for the life of the mount, never a live prop.
  const initialLocationRef = useRef(initialLocation)

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

    // Per-lesson tracking: Rise writes lesson_location exactly at a lesson
    // boundary. The server dedupes, so posting every write is fine.
    api.on('LMSSetValue.cmi.core.lesson_location', (_cmiElement: string, value: string) => {
      if (!value) return
      postContentEvent({ event: 'lesson_location', location: String(value) })
    })

    // Time-spent: session_time is the accumulated seconds for THIS session and
    // ticks up ~every 20s. Post the delta since the last tick (capped, and
    // negatives — a session reset — skipped) so the server can sum it.
    api.on('LMSSetValue.cmi.core.session_time', (_cmiElement: string, value: string) => {
      const seconds = parseScormTime(String(value))
      if (seconds === null) return
      let delta = seconds - lastSecondsRef.current
      lastSecondsRef.current = seconds
      if (!Number.isFinite(delta) || delta <= 0) return // reset or garbage — skip
      if (delta > 60) delta = 60 // ticks are ~20s apart; cap absurd jumps
      postContentEvent({ event: 'session_time', deltaSeconds: delta })
    })

    // Resume: seed the last-reached lesson before initialize, so the driver
    // reports it back and Rise opens there instead of at lesson 1. Must precede
    // window.API assignment (and therefore the iframe mount).
    if (initialLocationRef.current) {
      api.loadFromJSON({ core: { lesson_location: initialLocationRef.current } })
    }

    window.API = api
    setApiReady(true)

    return () => {
      if (window.API === api) delete window.API
      setApiReady(false)
    }
  }, [])

  return (
    <div className={className}>
      <div className={frameClassName ?? DEFAULT_FRAME}>
        {apiReady ? (
          <iframe
            title="AI Staff Compliance Certificate — course content"
            src={LAUNCH_URL}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-[#8A8A8A]">Loading course…</p>
          </div>
        )}
      </div>
    </div>
  )
}
