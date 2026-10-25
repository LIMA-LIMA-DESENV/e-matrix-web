import { useMemo } from 'react'

import {
  type ImprovementProjectActivity,
  useGetImprovementProjectsActivities,
} from '@/http/api'

import type { ActivityOptionsState } from './ImprovementProjectForm'

/**
 * The options of the activity select, from `GET /improvement-projects/
 * activities` (FR-016, D-6): any role may read it, unlike `/activities`.
 * Disabled for who may not edit, since the form is never shown to them.
 */
export function useActivityOptions(enabled: boolean): ActivityOptionsState {
  const { data, isLoading, isError, refetch } =
    useGetImprovementProjectsActivities({ query: { enabled } })

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
