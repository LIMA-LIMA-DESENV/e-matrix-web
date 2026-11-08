'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  type FormEventHandler,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { Button, Card, Input, inputVariants, Label } from '@/components/ui'
import { formatEvaluationActivity } from '../components/listing'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

/*
 * The pieces shared by the forms of the evaluation types (HitListForm,
 * ChecklistForm): the same layout, controls, header, footer and submit
 * guard, so the types differ only in their sections.
 */

export const inputClasses =
  'h-12 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

export const textareaClasses =
  'h-auto resize-y rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20'

export const fieldsetResetClasses = 'm-0 min-w-0 border-0 p-0'

/** The id of the control of an answer, also its label's `htmlFor`. */
export function answerId(key: string) {
  return `answer-${key}`
}

export function Field({
  label,
  htmlFor,
  error,
  help,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  help?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className ?? 'space-y-2'}>
      <Label
        htmlFor={htmlFor}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : (
        help && <div className="text-xs text-on-surface-variant">{help}</div>
      )}
    </div>
  )
}

/** A text field: a single line, or a text area with `multiline`. */
export function TextField({
  id,
  label,
  registration,
  error,
  multiline = false,
  className,
}: {
  id: string
  label: string
  registration: UseFormRegisterReturn
  error?: string
  multiline?: boolean
  className?: string
}) {
  return (
    <Field label={label} htmlFor={id} error={error} className={className}>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          aria-invalid={error ? true : undefined}
          className={inputVariants({ className: textareaClasses })}
          {...registration}
        />
      ) : (
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          {...registration}
        />
      )}
    </Field>
  )
}

/**
 * A yes/no answer in three states (FR-011, FR-012): a radio group labelled by
 * its question (NFR-004), so the arrow keys move between yes, no and no
 * answer. `''` is "no answer", which the API stores as absent.
 */
export function ThreeStateAnswer({
  id,
  legend,
  registration,
  yesLabel,
  noLabel,
}: {
  id: string
  legend: ReactNode
  registration: UseFormRegisterReturn
  yesLabel: string
  noLabel: string
}) {
  const t = useTranslations('evaluations')
  const options = [
    { value: 'true', label: yesLabel, suffix: 'yes' },
    { value: 'false', label: noLabel, suffix: 'no' },
    { value: '', label: t('form.noAnswer'), suffix: 'none' },
  ] as const
  const legendId = `${id}-legend`

  return (
    <div className="space-y-2">
      <p
        id={legendId}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {legend}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
      >
        {options.map((option) => {
          const optionId = `${id}-${option.suffix}`

          return (
            <label
              key={option.suffix}
              htmlFor={optionId}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-on-surface"
            >
              <input
                id={optionId}
                type="radio"
                value={option.value}
                className="h-4 w-4 accent-primary"
                {...registration}
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A required single choice among scored options (CP FR-018): a radio group
 * labelled by its question (NFR-008), so the arrow keys move the choice, with
 * each option shown as "( n ) label", n its points, as in the legacy. There
 * is no "no answer" option: a new record starts with none checked, and once
 * an option is chosen only another can replace it. The value of an option is
 * its points as a string; `''` is no choice yet.
 */
export function ChoiceAnswer({
  id,
  legend,
  registration,
  options,
  error,
}: {
  id: string
  legend: ReactNode
  registration: UseFormRegisterReturn
  options: readonly { points: number; label: string }[]
  error?: string
}) {
  const legendId = `${id}-legend`
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <p
        id={legendId}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {legend}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-required
        className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
      >
        {options.map((option) => {
          const optionId = `${id}-${option.points}`

          return (
            <label
              key={option.points}
              htmlFor={optionId}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-on-surface"
            >
              <input
                id={optionId}
                type="radio"
                value={String(option.points)}
                className="h-4 w-4 accent-primary"
                {...registration}
              />
              <span>
                <span className="tabular-nums">( {option.points} )</span>{' '}
                {option.label}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="ml-1 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** One section of the form, in the order of the report (R-2). */
export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-6 border-t border-outline-variant/30 pt-8 first:border-t-0 first:pt-0"
    >
      <div>
        <h2
          id={headingId}
          className="font-headline text-xl font-extrabold tracking-tight text-ematrix-dark"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * A titled group inside a section: one item, or one block of questions,
 * with an optional footer (the score of a block).
 */
export function Group({
  title,
  footer,
  children,
}: {
  title: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 p-5">
      <fieldset className={`${fieldsetResetClasses} space-y-4`}>
        <legend className="mb-4">
          <h3 className="text-base font-bold text-ematrix-dark">{title}</h3>
        </legend>
        {children}
      </fieldset>
      {footer}
    </div>
  )
}

/**
 * The activity select (FR-009): the options of the type, with the state of
 * their load below it. Without the list nothing valid can be chosen, so the
 * select waits for it, and a failed load offers to retry (§12).
 */
export function ActivityField({
  activities,
  readOnly,
  error,
  registration,
}: {
  activities: EvaluationActivityOptionsState
  readOnly: boolean
  error?: string
  registration: UseFormRegisterReturn
}) {
  const t = useTranslations('evaluations')
  const tc = useTranslations('common')
  const isReady = !activities.isLoading && !activities.isError

  function help() {
    if (readOnly) return null
    if (activities.isLoading) return t('form.activitiesLoading')

    if (activities.isError) {
      return (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-2 font-medium text-error"
        >
          {t('form.activitiesLoadError')}
          <button
            type="button"
            onClick={activities.onRetry}
            className="font-bold underline hover:no-underline"
          >
            {tc('retry')}
          </button>
        </p>
      )
    }

    return activities.options.length === 0
      ? t('form.activitiesEmpty')
      : t('form.activityHint')
  }

  return (
    <Field
      label={t('columns.activity')}
      htmlFor="activity_id"
      error={error}
      help={help()}
    >
      <select
        id="activity_id"
        disabled={!readOnly && !isReady}
        aria-invalid={error ? true : undefined}
        className={inputVariants({
          className: `${inputClasses} w-full cursor-pointer text-sm text-on-surface`,
        })}
        {...registration}
      >
        <option value="">{t('form.activityPlaceholder')}</option>
        {activities.options.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {formatEvaluationActivity(activity)}
          </option>
        ))}
      </select>
    </Field>
  )
}

/**
 * Sends a form at most once at a time (§12). `POST` is not idempotent, the
 * button is disabled only after React re-renders, and validation is async, so
 * a fast double click would reach `onSubmit` twice: the ref drops the second
 * one. After a save it stays set, since the screen still refreshes the caches
 * before leaving and the mutation is no longer pending by then.
 */
export function useGuardedSubmit<T>({
  readOnly,
  isReady,
  onSubmit,
}: {
  readOnly: boolean
  isReady: boolean
  onSubmit?: (data: T) => Promise<boolean>
}) {
  const isSendingRef = useRef(false)
  const [isSaved, setIsSaved] = useState(false)

  async function handleValid(data: T) {
    if (readOnly || !onSubmit || !isReady) return
    if (isSendingRef.current) return
    isSendingRef.current = true

    let saved = false
    try {
      saved = await onSubmit(data)
    } finally {
      isSendingRef.current = saved
    }
    if (saved) setIsSaved(true)
  }

  return { handleValid, isSaved }
}

export interface EvaluationFormLayoutProps {
  /** The tab's type, translated: the breadcrumb and the descriptions. */
  typeLabel: string
  /** The record's code, or "Nova …" to create. */
  title: string
  description: string
  readOnly: boolean
  /** Every control disabled: the view, and the form while it is sent. */
  isLocked: boolean
  isCreate: boolean
  /** "Salvar" shows its pending label. */
  isBusy: boolean
  submitDisabled: boolean
  listHref: string
  headerActions?: ReactNode
  errorMessage?: string | null
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}

/**
 * The frame of an evaluation form (J1 to J3): the breadcrumb, the title and
 * the header buttons, the error of the API at the top, the sections in one
 * card whose disabled fieldset disables every control for real (NFR-004),
 * and, unless read only, the fixed footer with "Cancelar" and "Salvar".
 */
export function EvaluationFormLayout({
  typeLabel,
  title,
  description,
  readOnly,
  isLocked,
  isCreate,
  isBusy,
  submitDisabled,
  listHref,
  headerActions,
  errorMessage,
  onSubmit,
  children,
}: EvaluationFormLayoutProps) {
  const t = useTranslations('evaluations')
  const tc = useTranslations('common')
  const errorRef = useRef<HTMLDivElement>(null)

  // The form is long and "Salvar" sits in the fixed footer: an error of the
  // API is brought into view, at the top, with the data kept (§12).
  useEffect(() => {
    if (!errorMessage) return
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    errorRef.current?.focus({ preventScroll: true })
  }, [errorMessage])

  return (
    <form
      className={`space-y-6 ${readOnly ? 'pb-8' : 'pb-32'}`}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={listHref} className="hover:text-primary">
              {t('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{typeLabel}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {title}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {headerActions}
          <Link
            href={listHref}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              arrow_back
            </span>
            {tc('back')}
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error outline-none"
        >
          {errorMessage}
        </div>
      )}

      <Card className="overflow-hidden rounded-xl border border-outline-variant/20 bg-white p-0 shadow-[0_24px_40px_rgba(0,0,0,0.05)]">
        <div className="h-1.5 w-full bg-primary-container" />
        {/* One disabled fieldset disables every control for real: the view,
            and the form while it is being sent (NFR-004). */}
        <fieldset
          disabled={isLocked}
          className={`${fieldsetResetClasses} space-y-8 p-6 md:p-8`}
        >
          {children}
        </fieldset>
      </Card>

      {!readOnly && (
        <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-var(--shell-sidebar-width,16rem))]">
          <div className="mx-auto flex max-w-6xl justify-end gap-3">
            <Link
              href={listHref}
              className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
            >
              {tc('cancel')}
            </Link>
            {/* Disabled while pending: the POST is not idempotent, so a
                double click would create two records (§12). */}
            <Button
              type="submit"
              disabled={submitDisabled}
              className="rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
            >
              {isBusy
                ? isCreate
                  ? t('form.creating')
                  : tc('saving')
                : isCreate
                  ? t('form.create')
                  : t('form.update')}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
