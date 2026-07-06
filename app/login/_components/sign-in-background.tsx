'use client'

import { useEffect, useRef, useState } from 'react'

// Full-bleed drone-footage background for /login.
//
// The poster JPG is always painted as the base layer (covers the video's load
// gap and is the sole background on mobile / reduced-motion). The <video> is
// only mounted on desktop (>= md) AND when the user hasn't asked to reduce
// motion — so phones never download the multi-MB mp4. Playback is slowed to
// 0.7× so the fast-moving highway cars read as calm, not frantic. No `loop` —
// the clip plays once and freezes on its final frame (Max's call).

const POSTER = '/sign-in-bg-poster.jpg'
const VIDEO = '/sign-in-bg.mp4'
const PLAYBACK_RATE = 0.7 // starting value — Max tunes visually once live

export function SignInBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isDesktop = window.matchMedia('(min-width: 768px)')
    const evaluate = () => setShowVideo(isDesktop.matches && !reduceMotion.matches)

    evaluate()
    reduceMotion.addEventListener('change', evaluate)
    isDesktop.addEventListener('change', evaluate)
    return () => {
      reduceMotion.removeEventListener('change', evaluate)
      isDesktop.removeEventListener('change', evaluate)
    }
  }, [])

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.playbackRate = PLAYBACK_RATE
    }
  }, [showVideo])

  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900">
      {/* Base layer — poster image, always present */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${POSTER})` }}
      />

      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO}
          poster={POSTER}
          muted
          autoPlay
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = PLAYBACK_RATE
          }}
        />
      )}

      {/* Dark overlay — keeps the white card + wordmark readable */}
      <div className="absolute inset-0 bg-black/65" />
    </div>
  )
}
