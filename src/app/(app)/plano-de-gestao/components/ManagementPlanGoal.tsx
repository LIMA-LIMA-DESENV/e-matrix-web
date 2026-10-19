'use client'

import { useTranslations } from 'next-intl'
import { type KeyboardEvent, useId, useState } from 'react'

import { MAX_MANAGEMENT_PLAN_GOAL } from './grid'

const GOAL_PATTERN = /^-?\d+$/

interface ManagementPlanGoalProps {
  score: number
  goal: number
  canEdit: boolean
  disabled: boolean
  onChange: (goal: number) => void
}

/**
 * The sentence under the grid with the score and the goal (FR-021). For
 * `canEdit` the goal is a number field inside the sentence, like the legacy
 * x-editable (J4, H-2): Enter, or leaving the field with a changed value,
 * confirms; Esc restores the saved goal. Only an integer from 0 to 16 is sent
 * (R-9); anything else shows the message and makes no request. The field shows
 * the saved goal again whenever the API answers with a new one.
 */
export function ManagementPlanGoal({
  score,
  goal,
  canEdit,
  disabled,
  onChange,
}: ManagementPlanGoalProps) {
  const t = useTranslations('managementPlan')
  const errorId = useId()
  const saved = String(goal)
  const [draft, setDraft] = useState(saved)
  const [lastSaved, setLastSaved] = useState(saved)
  const [wasDisabled, setWasDisabled] = useState(disabled)
  const [isInvalid, setIsInvalid] = useState(false)

  // A new goal from the API, or the end of a save that failed, puts the saved
  // value back in the field: it never keeps a value the server did not take.
  if (saved !== lastSaved || (wasDisabled && !disabled)) {
    setLastSaved(saved)
    setDraft(saved)
    setIsInvalid(false)
  }
  if (disabled !== wasDisabled) setWasDisabled(disabled)

  function confirm() {
    if (disabled) return

    const value = draft.trim()
    if (value === saved) {
      setIsInvalid(false)
      return
    }

    const parsed = Number(value)
    if (
      !GOAL_PATTERN.test(value) ||
      parsed < 0 ||
      parsed > MAX_MANAGEMENT_PLAN_GOAL
    ) {
      setIsInvalid(true)
      return
    }

    setIsInvalid(false)
    onChange(parsed)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      confirm()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(saved)
      setIsInvalid(false)
    }
  }

  const sentence = t.rich('goalSentence', {
    score,
    goal,
    strong: (chunks) => <strong>{chunks}</strong>,
    goalValue: (chunks) =>
      canEdit ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_MANAGEMENT_PLAN_GOAL}
          step={1}
          value={draft}
          disabled={disabled}
          aria-label={t('goalInput')}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? errorId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirm}
          className="mx-1 h-8 w-16 rounded-md border border-outline-variant bg-surface-container-high px-2 text-center font-bold text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-wait disabled:opacity-60 aria-[invalid=true]:border-error aria-[invalid=true]:ring-error"
        />
      ) : (
        <strong>{chunks}</strong>
      ),
  })

  return (
    <div className="mt-4 space-y-1 text-center">
      <p className="flex items-center justify-center gap-2 text-sm text-on-surface">
        <span>{sentence}</span>
        <span className="material-symbols-outlined text-lg" aria-hidden>
          flag
        </span>
      </p>
      {isInvalid && (
        <p id={errorId} role="alert" className="text-xs font-medium text-error">
          {t('goalInvalid', { max: MAX_MANAGEMENT_PLAN_GOAL })}
        </p>
      )}
    </div>
  )
}
