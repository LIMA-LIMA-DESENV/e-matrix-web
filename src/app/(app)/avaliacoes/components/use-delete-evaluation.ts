'use client'

import { useQueryClient } from '@tanstack/react-query'

import type { EvaluationWebDefinition } from '../definitions'

/**
 * Deletes an evaluation of a type (J4, FR-016) for `DeleteEvaluationModal`:
 * on success the detail leaves the cache and the listing is refreshed; on
 * failure (404: deleted in another tab) the listing is refreshed too and the
 * error goes back to the modal, which shows it translated.
 *
 * The definition must not change while the screen is mounted: its DELETE is
 * a hook.
 */
export function useDeleteEvaluation(definition: EvaluationWebDefinition) {
  const queryClient = useQueryClient()
  const mutateAsync = definition.useDelete()
  const listKey = definition.listQueryKey()

  return async function deleteEvaluation({ id }: { id: string }) {
    try {
      await mutateAsync({ id })
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: listKey })
      throw error
    }

    queryClient.removeQueries({ queryKey: definition.detailQueryKey(id) })
    await queryClient.invalidateQueries({ queryKey: listKey })
  }
}
