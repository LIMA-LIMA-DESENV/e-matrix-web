'use client'

import { useQueryClient } from '@tanstack/react-query'

import {
  getGetEvaluationsChecklistsIdQueryKey,
  getGetEvaluationsChecklistsQueryKey,
  getGetEvaluationsHitListsIdQueryKey,
  getGetEvaluationsHitListsQueryKey,
  useDeleteEvaluationsChecklistsId,
  useDeleteEvaluationsHitListsId,
} from '@/http/api'
import type { EvaluationType } from '@/lib/evaluation-types'

/**
 * Deletes an evaluation of a type (J4, FR-016) for `DeleteEvaluationModal`:
 * on success the detail leaves the cache and the listing is refreshed; on
 * failure (404: deleted in another tab) the listing is refreshed too and the
 * error goes back to the modal, which shows it translated.
 */
export function useDeleteEvaluation(type: EvaluationType) {
  const queryClient = useQueryClient()
  const hitList = useDeleteEvaluationsHitListsId()
  const checklist = useDeleteEvaluationsChecklistsId()

  const isHitList = type === 'hit_list'
  const mutateAsync = isHitList ? hitList.mutateAsync : checklist.mutateAsync
  const listKey = isHitList
    ? getGetEvaluationsHitListsQueryKey()
    : getGetEvaluationsChecklistsQueryKey()

  return async function deleteEvaluation({ id }: { id: string }) {
    try {
      await mutateAsync({ id })
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: listKey })
      throw error
    }

    queryClient.removeQueries({
      queryKey: isHitList
        ? getGetEvaluationsHitListsIdQueryKey(id)
        : getGetEvaluationsChecklistsIdQueryKey(id),
    })
    await queryClient.invalidateQueries({ queryKey: listKey })
  }
}
