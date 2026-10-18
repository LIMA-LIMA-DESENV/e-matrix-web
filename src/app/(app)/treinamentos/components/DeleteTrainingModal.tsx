import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetTrainingsIdQueryKey,
  getGetTrainingsQueryKey,
  type Training,
  useDeleteTrainingsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface DeleteTrainingModalProps {
  /** The training to delete; `null` keeps the modal closed. */
  record: Pick<Training, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API deleted it and the list was invalidated. */
  onDeleted: (record: Pick<Training, 'id' | 'name'>) => void
}

/**
 * Confirms a training deletion, warning that it is final and that the signed
 * attendance list goes with it, with no copy kept (R-25, RK-8). There is **no
 * dependency check**: no module points at a training, so deletion is never
 * blocked (FR-018). Offered on the listing and on the edit page. A 404
 * (already deleted in another tab) is shown translated and the list is
 * refreshed.
 */
export function DeleteTrainingModal({
  record,
  onClose,
  onDeleted,
}: DeleteTrainingModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteTrainingDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteTrainingDialog({
  record,
  onClose,
  onDeleted,
}: DeleteTrainingModalProps & { record: Pick<Training, 'id' | 'name'> }) {
  const t = useTranslations('trainings.delete')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const { mutateAsync: deleteTraining, isPending } = useDeleteTrainingsId()

  async function handleConfirm() {
    setDeleteError(null)

    try {
      await deleteTraining({ id: record.id })
    } catch (error) {
      setDeleteError(error)
      void queryClient.invalidateQueries({
        queryKey: getGetTrainingsQueryKey(),
      })
      return
    }

    queryClient.removeQueries({
      queryKey: getGetTrainingsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetTrainingsQueryKey(),
    })
    onDeleted(record)
  }

  const strong = (chunks: ReactNode) => (
    <span className="font-bold text-on-surface">{chunks}</span>
  )

  return (
    <ConfirmActionModal
      open
      title={t('title')}
      description={
        <div className="space-y-3">
          <p>{t.rich('question', { name: record.name, strong })}</p>
          <p>{t('description')}</p>
        </div>
      }
      confirmLabel={t('confirm')}
      pendingLabel={t('deleting')}
      destructive
      isSubmitting={isPending}
      errorMessage={deleteError ? translateError(deleteError) : null}
      onCancel={() => {
        if (!isPending) onClose()
      }}
      onConfirm={handleConfirm}
    />
  )
}
