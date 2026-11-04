import { useMemo } from 'react'

import {
  type ImprovementProjectActivity,
  useGetEvaluationsChangeAssessmentsActivities,
  useGetEvaluationsChecklistsActivities,
  useGetEvaluationsHitListsActivities,
} from '@/http/api'
import type { EvaluationType } from '@/lib/evaluation-types'

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
 * while the type is enabled. Only the query of `type` runs, and only when
 * `enabled`: the form of a Viewer, the view, never needs it.
 */
export function useEvaluationActivityOptions(
  type: EvaluationType,
  enabled: boolean
): EvaluationActivityOptionsState {
  const hitList = useGetEvaluationsHitListsActivities({
    query: { enabled: enabled && type === 'hit_list' },
  })
  const checklist = useGetEvaluationsChecklistsActivities({
    query: { enabled: enabled && type === 'checklist' },
  })
  const changeAssessment = useGetEvaluationsChangeAssessmentsActivities({
    query: { enabled: enabled && type === 'change_assessment' },
  })
  const { data, isLoading, isError, refetch } =
    type === 'hit_list'
      ? hitList
      : type === 'checklist'
        ? checklist
        : changeAssessment

  const options = useMemo<ImprovementProjectActivity[]>(
    () => (data?.status === 200 ? data.data : []),
    [data]
  )

  return {
    options,
    isLoading,
    isError: isError || (!!data && data.status !== 200),
    onRetry: () => void refetch(),
  }
}
