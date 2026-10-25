'use client'

import { useQueryClient } from '@tanstack/react-query'

import {
  getGetMaterialReceiptsIdQueryKey,
  getGetMaterialReceiptsQueryKey,
  useDeleteMaterialReceiptsId,
} from '@/http/api'

/**
 * Deletes an RA (J12) for `DeleteProjectModal`: on success the detail leaves
 * the cache and every slice of the listing is refreshed; on failure (404:
 * deleted in another tab) the listing is refreshed too and the error goes
 * back to the modal, which shows it translated.
 */
export function useDeleteMaterialReceipt() {
  const queryClient = useQueryClient()
  const { mutateAsync } = useDeleteMaterialReceiptsId()

  return async function deleteMaterialReceipt({ id }: { id: string }) {
    try {
      await mutateAsync({ id })
    } catch (error) {
      void queryClient.invalidateQueries({
        queryKey: getGetMaterialReceiptsQueryKey(),
      })
      throw error
    }

    queryClient.removeQueries({
      queryKey: getGetMaterialReceiptsIdQueryKey(id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetMaterialReceiptsQueryKey(),
    })
  }
}
