import { ALL_PERIODS } from '@/components/list'
import type { ImprovementProjectScope, Period } from '@/http/api'
import type { ImprovementProjectPhotoKey } from '@/lib/download-file'
import { findPeriodContainingDate } from '@/lib/periods'

import { SCOPE_TYPES } from '../components/types'

/** The tab each record lives on: RGP on Produção, RGA (and RA) on Escritório. */
export const PROJECT_TAB_PATHS = {
  production: '/projetos/producao',
  office: '/projetos/escritorio',
} as const satisfies Record<ImprovementProjectScope, string>

/**
 * Create route of a project register type, or its edit route with `id`
 * (D-13): `/projetos/rgp/novo`, `/projetos/rga/<id>/editar`.
 */
export function improvementProjectFormPath(
  scope: ImprovementProjectScope,
  id?: string
) {
  const base = `/projetos/${SCOPE_TYPES[scope]}`
  return id ? `${base}/${id}/editar` : `${base}/novo`
}

/**
 * Create route of an RA, or its edit route with `id` (D-13):
 * `/projetos/ra/novo`, `/projetos/ra/<id>/editar`. The RA lives on Escritório.
 */
export function materialReceiptFormPath(id?: string) {
  return id ? `/projetos/ra/${id}/editar` : '/projetos/ra/novo'
}

/**
 * The removal param of each photo, so the listing's message says which one is
 * gone (R-19).
 */
export const PHOTO_REMOVED_PARAMS = {
  'before-photo': 'beforePhotoRemoved',
  'after-photo': 'afterPhotoRemoved',
} as const satisfies Record<ImprovementProjectPhotoKey, string>

/** The removal param of the receipt form of an RA (R-19). */
export const FILE_REMOVED_PARAM = 'fileRemoved'

/**
 * One-shot success params the tab reads and then drops. Each carries the
 * record's code, which is what the message cites (J8).
 */
export const FEEDBACK_PARAMS = [
  'created',
  'updated',
  PHOTO_REMOVED_PARAMS['before-photo'],
  PHOTO_REMOVED_PARAMS['after-photo'],
  FILE_REMOVED_PARAM,
] as const

export type ProjectFeedbackParam = (typeof FEEDBACK_PARAMS)[number]

interface SearchParamsLike {
  toString(): string
}

interface Feedback {
  param: ProjectFeedbackParam
  /** The record's code, e.g. `RGP-15`. */
  code: string
}

type PeriodRanges = readonly Pick<Period, 'id' | 'start_date' | 'end_date'>[]

function listParams(searchParams: SearchParamsLike) {
  const params = new URLSearchParams(searchParams.toString())
  for (const key of FEEDBACK_PARAMS) params.delete(key)
  return params
}

function toHref(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * A form route carrying the tab's state (`?period=…&type=…`), so going back
 * keeps the slice, the filters and the page the user came from.
 */
export function projectFormHref(path: string, searchParams: SearchParamsLike) {
  return toHref(path, listParams(searchParams))
}

/** The tab as the user left it, read from the form route's params. */
export function projectsListHref(
  listPath: string,
  searchParams: SearchParamsLike
) {
  return toHref(listPath, listParams(searchParams))
}

/** The tab as the user left it, with a success message to show. */
export function projectsListHrefWithFeedback(
  listPath: string,
  searchParams: SearchParamsLike,
  feedback: Feedback
) {
  const params = listParams(searchParams)
  params.set(feedback.param, feedback.code)
  return toHref(listPath, params)
}

/**
 * The tab after a save, with its success message. The filter moves to the
 * period of the saved date when that is not the slice the user came from, so
 * the saved record shows instead of vanishing (J8); `all` already shows it
 * and is kept. A `?type=` that would hide the record (an RGA saved while the
 * Escritório tab showed only RA) is dropped, for the same reason. A new slice
 * starts on page 1.
 */
export function projectsListHrefAfterSave(
  listPath: string,
  searchParams: SearchParamsLike,
  periods: PeriodRanges,
  saved: { date: string; type: string },
  feedback: Feedback
) {
  const params = listParams(searchParams)
  const current = params.get('period')

  if (current !== ALL_PERIODS) {
    const target = findPeriodContainingDate(periods, saved.date)

    if (target && target.id !== current) {
      params.set('period', target.id)
      params.delete('page')
    }
  }

  const type = params.get('type')
  if (type && type !== 'all' && type !== saved.type) {
    params.delete('type')
    params.delete('page')
  }

  return projectsListHrefWithFeedback(listPath, params, feedback)
}
