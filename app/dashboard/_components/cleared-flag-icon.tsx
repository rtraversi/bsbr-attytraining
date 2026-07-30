/**
 * The green pennant that marks a cleared lesson on the Quizzes "Your path" map.
 *
 * Lives here rather than in quizzes-client.tsx because the knowledge-check
 * result card plants the same flag when a lesson is cleared, and quizzes-client
 * already imports that modal — importing the icon back out of it would be a
 * cycle. Shared placement is also the point: the celebration is meant to read as
 * this exact flag going into the map the learner has been climbing.
 */
export function ClearedFlagIcon({ className }: { className?: string }) {
  // Green pennant on a pole (green = a cleared level). The pole's bottom sits on
  // the icon's bottom edge, so callers can plant it by anchoring that edge.
  return (
    <svg className={className} viewBox="0 0 1080 1080" fill="none">
      <g transform="matrix(2.95248,0,0,2.95248,-380.144,-1240.04)">
        <g transform="matrix(0.607509,0,0,0.737262,-36.3326,470.984)">
          <rect x="489" y="90" width="102" height="337" fill="#9CA3AF" />
        </g>
        <g transform="matrix(2.43552,0,0,1.38838,-1178.65,295.046)">
          <path d="M591,90L687,169L591,263.991L591,90Z" fill="#22C55E" />
        </g>
      </g>
    </svg>
  )
}
