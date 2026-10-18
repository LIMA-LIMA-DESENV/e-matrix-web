import { ALL_PERIODS } from '@/components/list'
import type { Period } from '@/http/api'
import type { MeetingAttachmentKey } from '@/lib/download-file'
import { findPeriodContainingDate } from '@/lib/periods'

export const MEETINGS_LIST_PATH = '/reunioes'

/**
 * The removal param of each attachment, so the listing's message says which
 * one is gone (R-18).
 */
export const FILE_REMOVED_PARAMS = {
  'presence-list': 'presenceListRemoved',
  minutes: 'minutesRemoved',
} as const satisfies Record<MeetingAttachmentKey, string>

/** One-shot success params the listing reads and then drops. */
export const FEEDBACK_PARAMS = [
  'created',
  'updated',
  FILE_REMOVED_PARAMS['presence-list'],
  FILE_REMOVED_PARAMS.minutes,
  'deleted',
] as const

export type MeetingFeedbackParam = (typeof FEEDBACK_PARAMS)[number]

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
  return query ? `${MEETINGS_LIST_PATH}?${query}` : MEETINGS_LIST_PATH
}

/**
 * A form route carrying the listing's state (`?period=…&type=…`), so going
 * back keeps the slice, the filters and the page the user came from.
 */
export function meetingFormHref(path: string, searchParams: SearchParamsLike) {
  const query = listParams(searchParams).toString()
  return query ? `${path}?${query}` : path
}

/** The listing as the user left it, read from the form route's params. */
export function meetingsListHref(searchParams: SearchParamsLike) {
  return toHref(listParams(searchParams))
}

interface Feedback {
  param: MeetingFeedbackParam
  value: string
}

/** The listing as the user left it, with a success message to show. */
export function meetingsListHrefWithFeedback(
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
export function meetingsListHrefAfterSave(
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

  return meetingsListHrefWithFeedback(params, feedback)
}
