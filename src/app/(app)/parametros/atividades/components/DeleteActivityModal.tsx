import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  type Activity,
  getGetActivitiesIdQueryKey,
  getGetActivitiesQueryKey,
  useDeleteActivitiesId,
  useGetActivitiesId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { ActivityLinkedRecordsCounts } from './ActivityLinkedRecords'

interface DeleteActivityModalProps {
  /** The activity to delete; `null` keeps the modal closed. */
  activity: Pick<Activity, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API deleted the activity and the list was invalidated. */
  onDeleted: (activity: Pick<Activity, 'id' | 'name'>) => void
}

/**
 * Confirms an activity deletion. The linked records are fetched on every
 * opening: with any of them the modal explains the block and offers no
 * confirmation. A 409 from the API (counts changed meanwhile) or a 404 (the
 * activity is already gone) is shown translated and the counts are fetched
 * again.
 */
export function DeleteActivityModal({
  activity,
  onClose,
  onDeleted,
}: DeleteActivityModalProps) {
  if (!activity) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteActivityDialog
      key={activity.id}
      activity={activity}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteActivityDialog({
  activity,
  onClose,
  onDeleted,
}: DeleteActivityModalProps & {
  activity: Pick<Activity, 'id' | 'name'>
}) {
  const t = useTranslations('activities.delete')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const {
    data: detailResponse,
    isFetching,
    isError: isDetailError,
    error: detailError,
  } = useGetActivitiesId(activity.id, {
    // Never trust cached counts: they decide whether deletion is offered.
    query: { staleTime: 0, refetchOnMount: 'always', retry: false },
  })

  const { mutateAsync: deleteActivity, isPending } = useDeleteActivitiesId()

  const linkedRecords =
    !isFetching && detailResponse?.status === 200
      ? detailResponse.data.linked_records
      : undefined
  const canConfirm = linkedRecords?.total === 0
  const isBlocked = !!linkedRecords && linkedRecords.total > 0

  const errorSource = deleteError ?? (isDetailError ? detailError : null)
  const errorMessage = errorSource ? translateError(errorSource) : null

  function handleCancel() {
    if (isPending) return
    onClose()
  }

  async function handleConfirm() {
    if (!canConfirm) return

    setDeleteError(null)
    try {
      await deleteActivity({ id: activity.id })
    } catch (error) {
      setDeleteError(error)
      // Linked records may have appeared (409) or the activity may be gone
      // (404) since the modal opened: refresh the counts and the list.
      void queryClient.invalidateQueries({
        queryKey: getGetActivitiesIdQueryKey(activity.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetActivitiesQueryKey(),
      })
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetActivitiesQueryKey(),
    })
    onDeleted(activity)
  }

  const strong = (chunks: ReactNode) => (
    <span className="font-bold text-on-surface">{chunks}</span>
  )

  function renderDescription() {
    if (isBlocked) {
      return (
        <div className="space-y-3">
          <p>{t.rich('blocked', { name: activity.name, strong })}</p>
          <ActivityLinkedRecordsCounts linkedRecords={linkedRecords} />
        </div>
      )
    }

    if (canConfirm) {
      return (
        <div className="space-y-3">
          <p>{t.rich('question', { name: activity.name, strong })}</p>
          <p>{t('description')}</p>
        </div>
      )
    }

    return isFetching ? <p>{t('checking')}</p> : null
  }

  return (
    <ConfirmActionModal
      open
      title={t('title')}
      description={renderDescription()}
      confirmLabel={t('confirm')}
      pendingLabel={t('deleting')}
      destructive
      canConfirm={canConfirm}
      cancelLabel={canConfirm ? undefined : tc('close')}
      isSubmitting={isPending}
      errorMessage={errorMessage}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  )
}
