import {
  EVALUATION_TYPE_HREFS,
  type EvaluationType,
} from '@/lib/evaluation-types'

/**
 * One-shot success params the tab reads and then drops. Each carries the
 * record's code, which is what the message cites (J1, J3, FR-017).
 */
export const EVALUATION_FEEDBACK_PARAMS = ['created', 'updated'] as const

export type EvaluationFeedbackParam =
  (typeof EVALUATION_FEEDBACK_PARAMS)[number]

/**
 * The routes of a record of one type (D-8): `/avaliacoes/hit-list/novo`, the
 * view `/avaliacoes/hit-list/<id>` and `/avaliacoes/hit-list/<id>/editar`.
 */
export function evaluationFormPath(
  type: EvaluationType,
  target: { create: true } | { id: string; edit?: boolean }
) {
  const base = EVALUATION_TYPE_HREFS[type]
  if ('create' in target) return `${base}/novo`
  return target.edit ? `${base}/${target.id}/editar` : `${base}/${target.id}`
}

interface SearchParamsLike {
  toString(): string
}

function listParams(searchParams: SearchParamsLike) {
  const params = new URLSearchParams(searchParams.toString())
  for (const key of EVALUATION_FEEDBACK_PARAMS) params.delete(key)
  return params
}

function toHref(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * A record route carrying the tab's state (`?q=…&sort=…&page=…`), so going
 * back keeps the search, the sort and the page the user came from.
 */
export function evaluationFormHref(
  path: string,
  searchParams: SearchParamsLike
) {
  return toHref(path, listParams(searchParams))
}

/**
 * The tab as the user left it, read from the record route's params, with the
 * success message to show when given.
 */
export function evaluationsListHref(
  type: EvaluationType,
  searchParams: SearchParamsLike,
  feedback?: { param: EvaluationFeedbackParam; code: string }
) {
  const params = listParams(searchParams)
  if (feedback) params.set(feedback.param, feedback.code)
  return toHref(EVALUATION_TYPE_HREFS[type], params)
}
