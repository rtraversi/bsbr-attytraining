'use client'

import { MUTED, PILL_OFF, PILL_ON, TABLE_HEAD } from './intake-styles'
import { toolGridTools, reconcileToolGrid } from '@/lib/intake/branching'
import type { AnswerMap, ToolGridRow } from '@/lib/intake/types'

/**
 * The per-tool grid: one screen, one row per tool ticked in ai_tools.
 *
 * An explicit exception to one-question-at-a-time, approved by Katy 2026-08-26.
 * Asking a question per tool one at a time would be a dozen screens for a firm
 * with a dozen tools, and every one of them would look identical.
 *
 * Rows are DERIVED, never stored independently — including free-text `other:`
 * entries, which get the same column as a listed tool because Katy needs the
 * same fact about them.
 *
 * ── One column, since 2026-08-28 (Max) ──────────────────────────────────────
 *
 * There was a Tier column first — Personal / Team / Enterprise — kept generic
 * because vendors name their tiers differently. Generic was the flaw: Westlaw
 * Edge and CoCounsel have no consumer tier at all, so "Personal" was an answer
 * that could not be true of them, and a required grid gave the firm no way to
 * say so.
 *
 * The column below already asked what tier was standing in for. Tier was a
 * proxy for whether the vendor may train on client data; this asks the vendor's
 * agreement directly, which is the only place that answer lives. A consumer
 * tier with a signed no-training addendum is compliant and an enterprise tier
 * without one is not — and only this column can tell those apart.
 */
const AGREEMENT: { value: ToolGridRow['noTraining']; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  // A real state, not a hedge: a firm that does not know gets an instruction in
  // the policy to go and find out, which is a different clause from either.
  { value: 'unknown', label: "Don't know" },
]

export function ToolGridTable({
  answers,
  value,
  onChange,
}: {
  answers: AnswerMap
  value: ToolGridRow[]
  onChange: (rows: ToolGridRow[]) => void
}) {
  const tools = toolGridTools(answers)
  // Reconciled against the current selection every render, so unticking a tool
  // on the previous screen cannot leave a stale row behind it.
  const rows = reconcileToolGrid({ ...answers, tool_grid: value })

  const set = (tool: string, patch: Partial<ToolGridRow>) =>
    onChange(rows.map((r) => (r.tool === tool ? { ...r, ...patch } : r)))

  return (
    <div className="mt-5 overflow-x-auto">
      {/* Narrower now the grid is two columns rather than three. */}
      <table className="w-full min-w-[26rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className={TABLE_HEAD} style={{ width: '40%' }}>Tool</th>
            <th className={TABLE_HEAD}>
              No-training agreement
              <span className={`ml-2 font-normal normal-case tracking-normal ${MUTED}`}>
                signed, in writing
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => {
            const row = rows.find((r) => r.tool === tool.value)
            return (
              <tr key={tool.value} className="align-middle">
                <td className="py-3 pr-4 font-semibold">{tool.label}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {AGREEMENT.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => set(tool.value, { noTraining: a.value })}
                        className={row?.noTraining === a.value ? PILL_ON : PILL_OFF}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
