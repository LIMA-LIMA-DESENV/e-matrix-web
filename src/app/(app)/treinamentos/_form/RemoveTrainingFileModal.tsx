import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetTrainingsIdQueryKey,
  getGetTrainingsQueryKey,
  type getTrainingsIdResponse,
  type Training,
  useDeleteTrainingsIdFile,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface RemoveTrainingFileModalProps {
  /** The training whose attendance list to remove; `null` keeps it closed. */
  record: Pick<Training, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API removed the file and the caches were updated. */
  onRemoved: () => void
}

/**
 * Explicit confirmation for removing the attendance list of a training (R-20,
 * FR-026). The training itself stays: this is the gesture D-15 keeps separate
 * from replacing the file. The list is a signed document and the removal
 * keeps no copy (RK-8), which the modal says. The API answers 200 with the
 * updated training, which goes straight into the detail cache; a 404 (no file
 * any more) is shown translated.
 */
export function RemoveTrainingFileModal({
  record,
  onClose,
  onRemoved,
}: RemoveTrainingFileModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveTrainingFileDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onRemoved={onRemoved}
    />
  )
}

function RemoveTrainingFileDialog({
  record,
  onClose,
  onRemoved,
}: RemoveTrainingFileModalProps & {
  record: Pick<Training, 'id' | 'name'>
}) {
  const t = useTranslations('trainings.removeFile')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [removeError, setRemoveError] = useState<unknown>(null)

  const { mutateAsync: removeFile, isPending } = useDeleteTrainingsIdFile()

  async function handleConfirm() {
    setRemoveError(null)

    let response: Awaited<ReturnType<typeof removeFile>>

    try {
      response = await removeFile({ id: record.id })
    } catch (error) {
      setRemoveError(error)
      // The file may have been removed elsewhere (404): refresh both caches
      // so the screen stops offering a file that no longer exists.
      void queryClient.invalidateQueries({
        queryKey: getGetTrainingsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetTrainingsQueryKey(),
      })
      return
    }

    // The training comes back with `file: null` (D-15): no second request
    // for the detail. Every period slice of the listing is refreshed.
    if (response.status === 200) {
      queryClient.setQueryData<getTrainingsIdResponse>(
        getGetTrainingsIdQueryKey(record.id),
        response
      )
    }
    await queryClient.invalidateQueries({
      queryKey: getGetTrainingsQueryKey(),
    })
    onRemoved()
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
      pendingLabel={t('removing')}
      destructive
      isSubmitting={isPending}
      errorMessage={removeError ? translateError(removeError) : null}
      onCancel={() => {
        if (!isPending) onClose()
      }}
      onConfirm={handleConfirm}
    />
  )
}
