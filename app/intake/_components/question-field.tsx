'use client'

import { useMemo, useState } from 'react'
import {
  CHECKBOX,
  FIELD,
  INLINE_FIELD,
  MUTED,
  NOTICE,
  OPTION_ROW,
  PILL_OFF,
  PILL_ON,
} from './intake-styles'
import { RosterTable } from './roster-table'
import { ToolGridTable } from './tool-grid-table'
import {
  EXCLUSIVE_OPTION_VALUES,
  NOT_DECIDED_QUESTIONS,
  languageOptionsFor,
  stateOptionsFor,
} from '@/lib/intake/questions'
import {
  NOT_DECIDED_YET,
  isOtherValue,
  otherText,
  otherValue,
  type AnswerMap,
  type AnswerValue,
  type Question,
  type QuestionOption,
  type RosterRow,
  type ToolGridRow,
  type UploadRef,
} from '@/lib/intake/types'
import { INTAKE_UPLOAD_ACCEPT } from '@/lib/intake/uploads'

export interface FieldProps {
  question: Question
  answers: AnswerMap
  onChange: (value: AnswerValue | null) => void
  seatsPurchased: number | null
  adminName: string | null
  adminEmail: string
}

/**
 * One question, rendered by type.
 *
 * A switch rather than a component-per-type registry: nine cases in one file is
 * legible in a way nine files importing a shared contract is not, and the repo
 * has no component system to hang a registry off.
 */
export function QuestionField(props: FieldProps) {
  const { question } = props

  switch (question.type) {
    case 'text':
      return <TextField {...props} />
    case 'longtext':
      return <LongTextField {...props} />
    case 'yesno':
      return <YesNoField {...props} />
    case 'single':
      return <SingleField {...props} />
    case 'multi':
      return <MultiField {...props} />
    case 'states':
      return <StatesField {...props} />
    case 'languages':
      return <LanguagesField {...props} />
    case 'roster':
      return (
        <RosterTable
          value={(props.answers[question.key] as RosterRow[] | undefined) ?? []}
          onChange={(rows) => props.onChange(rows)}
          seatsPurchased={props.seatsPurchased}
          adminName={props.adminName}
          adminEmail={props.adminEmail}
        />
      )
    case 'tool-grid':
      return (
        <ToolGridTable
          answers={props.answers}
          value={(props.answers[question.key] as ToolGridRow[] | undefined) ?? []}
          onChange={(rows) => props.onChange(rows)}
        />
      )
    case 'upload':
      return <UploadField {...props} />
  }
}

// ---------------------------------------------------------------------------

function TextField({ question, answers, onChange }: FieldProps) {
  const value = (answers[question.key] as string | undefined) ?? ''
  return (
    <input
      className={`mt-5 ${FIELD}`}
      value={value}
      placeholder="Type your answer"
      onChange={(e) => onChange(e.target.value || null)}
    />
  )
}

/**
 * A paragraph, plus — on the two questions that need it — a visible affordance
 * that writes the NOT_DECIDED_YET sentinel.
 *
 * A button rather than the firm typing the words: Katy's export has to tell "the
 * firm has not taken a position" apart from "a firm wrote a sentence mentioning
 * not deciding", because the first gets prepared template text and the second
 * gets read.
 */
function LongTextField({ question, answers, onChange }: FieldProps) {
  const raw = (answers[question.key] as string | undefined) ?? ''
  const notDecided = raw === NOT_DECIDED_YET
  const offered = NOT_DECIDED_QUESTIONS.has(question.key)

  return (
    <div className="mt-5">
      <textarea
        className={`${FIELD} min-h-[7rem] resize-y leading-relaxed`}
        rows={4}
        value={notDecided ? '' : raw}
        disabled={notDecided}
        placeholder={notDecided ? '' : 'Write as much or as little as you like.'}
        onChange={(e) => onChange(e.target.value || null)}
      />
      {offered && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onChange(notDecided ? null : NOT_DECIDED_YET)}
            className={notDecided ? PILL_ON : PILL_OFF}
          >
            We haven&rsquo;t decided yet
          </button>
          <p className={`mt-2 text-[12.5px] ${MUTED}`}>
            A real answer, not a skip &mdash; the policy supplies prepared language for it.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Exactly two buttons, always. Katy's no-hedge rule lives here structurally: a
 * yesno cannot quietly grow a third option the way a `single` can.
 */
function YesNoField({ question, answers, onChange }: FieldProps) {
  const value = answers[question.key] as string | undefined
  return (
    <div className="mt-5 flex gap-2">
      {['yes', 'no'].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 ${value === v ? PILL_ON : PILL_OFF}`}
        >
          {v === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function SingleField({ question, answers, onChange }: FieldProps) {
  const value = answers[question.key] as string | undefined
  return (
    <div className="mt-4 flex flex-col gap-0.5">
      {(question.options ?? []).map((option) => (
        <label key={option.value} className={OPTION_ROW}>
          <input
            type="radio"
            name={question.key}
            className={CHECKBOX}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="text-[14.5px]">{option.label}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * Any of `options`, plus a free-text entry when allowOther.
 *
 * Exclusive options ("None", "None yet") clear everything else and are cleared
 * by everything else. Without that a firm can hold "None" and "Clio" at once,
 * which is not an answer — it is two, and Katy has to write and ask which.
 */
function MultiField({ question, answers, onChange }: FieldProps) {
  const selected = useMemo(
    () => ((answers[question.key] as string[] | undefined) ?? []),
    [answers, question.key],
  )
  const otherEntry = selected.find(isOtherValue)
  const [otherDraft, setOtherDraft] = useState(() => (otherEntry ? (otherText(otherEntry) ?? '') : ''))

  const toggle = (value: string) => {
    const has = selected.includes(value)
    let next: string[]

    if (has) {
      next = selected.filter((v) => v !== value)
    } else if (EXCLUSIVE_OPTION_VALUES.has(value)) {
      next = [value]
    } else {
      next = [...selected.filter((v) => !EXCLUSIVE_OPTION_VALUES.has(v)), value]
    }

    onChange(next.length > 0 ? next : null)
  }

  const setOther = (text: string) => {
    setOtherDraft(text)
    const wrapped = otherValue(text)
    const rest = selected.filter((v) => !isOtherValue(v) && !EXCLUSIVE_OPTION_VALUES.has(v))
    const next = wrapped ? [...rest, wrapped] : rest
    onChange(next.length > 0 ? next : null)
  }

  return (
    <div className="mt-4 flex flex-col gap-0.5">
      {(question.options ?? []).map((option) => (
        <label key={option.value} className={OPTION_ROW}>
          <input
            type="checkbox"
            className={CHECKBOX}
            checked={selected.includes(option.value)}
            onChange={() => toggle(option.value)}
          />
          <span className="text-[14.5px]">{option.label}</span>
        </label>
      ))}

      {question.allowOther && (
        <label className={OPTION_ROW}>
          <input
            type="checkbox"
            className={CHECKBOX}
            checked={!!otherEntry}
            readOnly
            // Ticking it does nothing on its own — the entry exists when there
            // is text. A checkbox that can be on with an empty box would write
            // `other:` and give Katy a tool with no name.
            onClick={(e) => e.preventDefault()}
          />
          <span className="flex w-full flex-wrap items-baseline gap-2 text-[14.5px]">
            Something else
            <input
              className={INLINE_FIELD}
              value={otherDraft}
              placeholder="name it"
              onChange={(e) => setOther(e.target.value)}
            />
          </span>
        </label>
      )}
    </div>
  )
}

/**
 * 56 US jurisdictions plus whatever extras the question adds.
 *
 * A filter box over toggle chips, not 56 checkboxes and not a native multi-
 * select. Fifty-six checkboxes is a wall; a native multiple select is unusable
 * on a phone and invisible as to what is chosen. Chips keep the answer readable
 * at a glance, which matters because this is the switch that decides most of
 * the drafted policy.
 */
/**
 * The filter-and-pick control, shared by `states` and `languages`.
 *
 * ── Why one component and not two ───────────────────────────────────────────
 *
 * `languages` was added on 2026-09-02 and is the same interaction as
 * `jurisdictions`: a long list nobody scrolls, made usable by typing. Copying
 * StatesField would have produced a near-duplicate that drifts — the two would
 * disagree about empty-state copy or overflow the first time either was
 * touched. The ONLY differences are the option source and two strings, so those
 * are parameters and everything else is shared by construction.
 *
 * `allowOther` is the languages-only exception: a firm serving a language off
 * the list must not be blocked. It writes an `other:`-prefixed value, the
 * convention already used by ai_tools, so optionLabel() and the policy
 * assembler resolve it with no further work.
 */
function FilterableMultiField({
  question,
  answers,
  onChange,
  options,
  filterPlaceholder,
  emptyLabel,
  allowOther = false,
  otherPlaceholder,
}: FieldProps & {
  options: QuestionOption[]
  filterPlaceholder: string
  emptyLabel: string
  allowOther?: boolean
  otherPlaceholder?: string
}) {
  const selected = ((answers[question.key] as string[] | undefined) ?? [])
  const [filter, setFilter] = useState('')

  // The extras (Federal courts, Outside the US) are pinned above the list —
  // they are not members of it, and alphabetising them in buries them.
  const extras = question.options ?? []
  const extraValues = new Set(extras.map((o) => o.value))
  const listed = options.filter((o) => !extraValues.has(o.value))

  const q = filter.trim().toLowerCase()
  const shown = q
    ? listed.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase() === q)
    : listed

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(next.length > 0 ? next : null)
  }

  // Free-text entries live in the SAME array as the picked ones, so a policy
  // clause naming the languages reads one list rather than stitching two.
  const others = selected.filter(isOtherValue)
  const otherDraft = otherText(others[0] ?? '') ?? ''

  const setOther = (text: string) => {
    const kept = selected.filter((v) => !isOtherValue(v))
    const wrapped = otherValue(text)
    const next = wrapped ? [...kept, wrapped] : kept
    onChange(next.length > 0 ? next : null)
  }

  const labelOf = (v: string) =>
    isOtherValue(v) ? (otherText(v) ?? v) : (options.find((o) => o.value === v)?.label ?? v)

  return (
    <div className="mt-5">
      {extras.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {extras.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={selected.includes(o.value) ? PILL_ON : PILL_OFF}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <input
        className={FIELD}
        value={filter}
        placeholder={filterPlaceholder}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="mt-3 flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
        {shown.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={selected.includes(o.value) ? PILL_ON : PILL_OFF}
          >
            {o.label}
          </button>
        ))}
        {shown.length === 0 && <p className={`text-[13px] ${MUTED}`}>No match.</p>}
      </div>

      {allowOther && (
        <div className="mt-4">
          <label
            htmlFor={`${question.key}-other`}
            className={`mb-1.5 block text-[13px] font-semibold`}
          >
            Not listed?
          </label>
          <input
            id={`${question.key}-other`}
            className={FIELD}
            value={otherDraft}
            placeholder={otherPlaceholder ?? 'Type it here'}
            onChange={(e) => setOther(e.target.value)}
          />
        </div>
      )}

      <p className={`mt-3 text-[13px] ${MUTED}`}>
        {selected.length === 0
          ? emptyLabel
          : `${selected.length} selected: ${selected.map(labelOf).join(', ')}`}
      </p>
    </div>
  )
}

function StatesField(props: FieldProps) {
  const options = useMemo(() => stateOptionsFor(props.question), [props.question])
  return (
    <FilterableMultiField
      {...props}
      options={options}
      filterPlaceholder="Filter states"
      emptyLabel="None selected yet."
    />
  )
}

function LanguagesField(props: FieldProps) {
  const options = useMemo(() => languageOptionsFor(props.question), [props.question])
  return (
    <FilterableMultiField
      {...props}
      options={options}
      filterPlaceholder="Filter languages"
      emptyLabel="None selected yet."
      allowOther
      otherPlaceholder="Another language"
    />
  )
}

/**
 * The existing-policy document.
 *
 * Uploads immediately rather than deferring to submit: the file is the one
 * answer that can fail for reasons the firm can act on (too large, wrong type),
 * and finding that out at Send means finding it out after they thought they
 * were finished.
 */
function UploadField({ question, answers, onChange }: FieldProps) {
  const current = answers[question.key] as UploadRef | undefined
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/intake/upload', { method: 'POST', body: form })
      const body = (await res.json()) as { value?: UploadRef; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'That upload did not go through.')
        return
      }
      // The route wrote the answer row itself; this only syncs local state, so
      // it must NOT re-save (that is why it goes through onChange with the
      // value the server returned rather than a locally built one).
      if (body.value) onChange(body.value)
    } catch {
      setError('That upload did not go through.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5">
      <input
        type="file"
        accept={INTAKE_UPLOAD_ACCEPT}
        disabled={busy}
        className={`${FIELD} file:mr-3 file:rounded-full file:border-0 file:bg-[var(--brand-emphasis)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void send(file)
        }}
      />
      <p className={`mt-2 text-[12.5px] ${MUTED}`}>PDF or Word, up to 10&nbsp;MB.</p>

      {busy && <p className={`mt-3 text-[13px] ${MUTED}`}>Uploading&hellip;</p>}
      {error && <p className={`mt-3 ${NOTICE}`}>{error}</p>}
      {current && !busy && (
        <p className="mt-3 text-[13.5px]">
          Attached: <span className="font-semibold">{current.originalName}</span>{' '}
          <span className={MUTED}>({Math.max(1, Math.round(current.bytes / 1024))} KB)</span>
        </p>
      )}
    </div>
  )
}
