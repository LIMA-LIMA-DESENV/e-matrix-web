import { ALL_PERIODS } from '@/components/list'
import type { Period } from '@/http/api'
import { findPeriodContainingDate } from '@/lib/periods'

export const TRAININGS_LIST_PATH = '/treinamentos'

/** One-shot success params the listing reads and then drops. */
export const FEEDBACK_PARAMS = [
  'created',
  'updated',
  'fileRemoved',
  'deleted',
] as const

export type TrainingFeedbackParam = (typeof FEEDBACK_PARAMS)[number]

interface SearchParamsLike {
  toString(): string
}

function listParams(searchParams: SearchParamsLike) {
  const params = new URLSearchParams(searchParams.toString())
  for (const key of FEEDBACK_PARAMS) params.delete(key)
  return params
}

function toHref(params: URLSearchParams) {
  const query = params.toString()
  return query ? `${TRAININGS_LIST_PATH}?${query}` : TRAININGS_LIST_PATH
}

/**
 * A form route carrying the listing's state (`?period=…&content=…`), so going
 * back keeps the slice, the filters and the page the user came from.
 */
export function trainingFormHref(path: string, searchParams: SearchParamsLike) {
  const query = listParams(searchParams).toString()
  return query ? `${path}?${query}` : path
}

/** The listing as the user left it, read from the form route's params. */
export function trainingsListHref(searchParams: SearchParamsLike) {
  return toHref(listParams(searchParams))
}

interface Feedback {
  param: TrainingFeedbackParam
  value: string
}

/** The listing as the user left it, with a success message to show. */
export function trainingsListHrefWithFeedback(
  searchParams: SearchParamsLike,
  feedback: Feedback
) {
  const params = listParams(searchParams)
  params.set(feedback.param, feedback.value)
  return toHref(params)
}

/**
 * The listing after a save, with its success message. When the saved date is
 * outside the slice the user came from, the filter moves to the period of
 * that date, so the saved record shows instead of vanishing from the slice
 * (J7); `all` already shows it and is kept. A new slice starts on page 1.
 */
export function trainingsListHrefAfterSave(
  searchParams: SearchParamsLike,
  periods: readonly Pick<Period, 'id' | 'start_date' | 'end_date'>[],
  date: string,
  feedback: Feedback
) {
  const params = listParams(searchParams)
  const current = params.get('period')

  if (current !== ALL_PERIODS) {
    const target = findPeriodContainingDate(periods, date)

    if (target && target.id !== current) {
      params.set('period', target.id)
      params.delete('page')
    }
  }

  return trainingsListHrefWithFeedback(params, feedback)
}
