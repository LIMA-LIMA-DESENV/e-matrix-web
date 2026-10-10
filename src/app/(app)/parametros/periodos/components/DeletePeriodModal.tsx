import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetPeriodsIdQueryKey,
  getGetPeriodsQueryKey,
  type Period,
  useDeletePeriodsId,
  useGetPeriodsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { LinkedRecordsCounts } from './PeriodLinkedRecords'

interface DeletePeriodModalProps {
  /** The period to delete; `null` keeps the modal closed. */
  period: Pick<Period, 'id' | 'description'> | null
  onClose: () => void
  /** Called after the API deleted the period and the list was invalidated. */
  onDeleted: (period: Pick<Period, 'id' | 'description'>) => void
}

/**
 * Confirms a period deletion. The linked records are fetched on every
 * opening: with any of them the modal explains the block and offers no
 * confirmation. A 409 from the API (counts changed meanwhile) is shown
 * translated and the counts are fetched again.
 */
export function DeletePeriodModal({
  period,
  onClose,
  onDeleted,
}: DeletePeriodModalProps) {
  if (!period) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeletePeriodDialog
      key={period.id}
      period={period}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeletePeriodDialog({
  period,
  onClose,
  onDeleted,
}: DeletePeriodModalProps & {
  period: Pick<Period, 'id' | 'description'>
}) {
  const t = useTranslations('periods.delete')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const {
    data: detailResponse,
    isFetching,
    isError: isDetailError,
    error: detailError,
  } = useGetPeriodsId(period.id, {
    // Never trust cached counts: they decide whether deletion is offered.
    query: { staleTime: 0, refetchOnMount: 'always', retry: false },
  })

  const { mutateAsync: deletePeriod, isPending } = useDeletePeriodsId()

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
      await deletePeriod({ id: period.id })
    } catch (error) {
      setDeleteError(error)
      // Linked records may have appeared (409) or the period may be gone
      // (404) since the modal opened: refresh the counts and the list.
      void queryClient.invalidateQueries({
        queryKey: getGetPeriodsIdQueryKey(period.id),
      })
      void queryClient.invalidateQueries({ queryKey: getGetPeriodsQueryKey() })
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetPeriodsQueryKey() })
    onDeleted(period)
  }

  const strong = (chunks: ReactNode) => (
    <span className="font-bold text-on-surface">{chunks}</span>
  )

  function renderDescription() {
    if (isBlocked) {
      return (
        <div className="space-y-3">
          <p>
            {t.rich('blocked', { description: period.description, strong })}
          </p>
          <LinkedRecordsCounts linkedRecords={linkedRecords} />
        </div>
      )
    }

    if (canConfirm) {
      return (
        <div className="space-y-3">
          <p>
            {t.rich('question', { description: period.description, strong })}
          </p>
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
