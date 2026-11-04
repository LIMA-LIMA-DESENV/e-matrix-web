import { useMemo } from 'react'

import type { ImprovementProjectActivity } from '@/http/api'

import type { EvaluationWebDefinition } from '../definitions/types'

/** The activities of the select of an evaluation form. */
export interface EvaluationActivityOptionsState {
  options: readonly ImprovementProjectActivity[]
  isLoading: boolean
  /** A failed load blocks the submit: there is nothing valid to choose (§12). */
  isError: boolean
  onRetry: () => void
}

/**
 * The options of the activity select of a type, from
 * `GET /evaluations/<type>/activities` (FR-009, D-4), which answers only
 * while the type is enabled. Only the query of the definition's type runs,
 * and only when `enabled`: the form of a Viewer, the view, never needs it.
 */
export function useEvaluationActivityOptions(
  definition: EvaluationWebDefinition,
  enabled: boolean
): EvaluationActivityOptionsState {
  const { data, isLoading, isError, refetch } =
    definition.useActivities(enabled)

  const options = useMemo<ImprovementProjectActivity[]>(
    () => data ?? [],
    [data]
  )

  return {
    options,
    isLoading,
    isError,
    onRetry: refetch,
  }
}
