// =============================================================================
// Prose helpers shared by the policy and the action list.
//
// Its own file because assemble.ts imports action-items.ts, so the action list
// cannot import from assemble.ts without a cycle.
// =============================================================================

/**
 * A list of answers, joined the way a sentence needs rather than a CSV.
 *
 * 🔴 Added 2026-09-07. Slots used to join with ", " unconditionally, which was
 * invisible while every slot sat at the END of its sentence. It stopped being
 * invisible the moment a clause named the firm's platforms MID-sentence:
 *
 *   "Interoffice communication platforms with AI features, Microsoft Teams,
 *    Slack, shall not be used for client information..."
 *
 * The trailing comma before "shall" reads as a typo in a legal document. Two
 * items take "and", three or more take the serial comma, which is what the rest
 * of Katy's document uses.
 */
export function joinForProse(labels: readonly string[]): string {
  if (labels.length <= 1) return labels.join('')
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}
