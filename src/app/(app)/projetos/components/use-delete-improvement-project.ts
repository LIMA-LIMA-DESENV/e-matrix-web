'use client'

import { useQueryClient } from '@tanstack/react-query'

import {
  getGetImprovementProjectsIdQueryKey,
  getGetImprovementProjectsQueryKey,
  useDeleteImprovementProjectsId,
} from '@/http/api'

/**
 * Deletes an RGP/RGA (J12) for `DeleteProjectModal`: on success the detail
 * leaves the cache and every slice of the listing is refreshed; on failure
 * (404: deleted in another tab) the listing is refreshed too and the error
 * goes back to the modal, which shows it translated.
 */
export function useDeleteImprovementProject() {
  const queryClient = useQueryClient()
  const { mutateAsync } = useDeleteImprovementProjectsId()

  return async function deleteImprovementProject({ id }: { id: string }) {
    try {
      await mutateAsync({ id })
    } catch (error) {
      void queryClient.invalidateQueries({
        queryKey: getGetImprovementProjectsQueryKey(),
      })
      throw error
    }

    queryClient.removeQueries({
      queryKey: getGetImprovementProjectsIdQueryKey(id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetImprovementProjectsQueryKey(),
    })
  }
}
