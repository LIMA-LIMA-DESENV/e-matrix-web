import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  type Document,
  getGetDocumentsIdQueryKey,
  getGetDocumentsQueryKey,
  useDeleteDocumentsIdFile,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface RemoveDocumentFileModalProps {
  /** The document whose file to remove; `null` keeps the modal closed. */
  record: Pick<Document, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API removed the file and the caches were invalidated. */
  onRemoved: () => void
}

/**
 * Explicit confirmation for removing the file of a document (R-13, FR-022).
 * The document itself stays: this is the gesture D-13 keeps separate from
 * replacing the file. There is nothing to check beforehand — the API answers
 * 404 `Document file not found.` when there is no file to remove, which the
 * modal shows translated.
 */
export function RemoveDocumentFileModal({
  record,
  onClose,
  onRemoved,
}: RemoveDocumentFileModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveDocumentFileDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onRemoved={onRemoved}
    />
  )
}

function RemoveDocumentFileDialog({
  record,
  onClose,
  onRemoved,
}: RemoveDocumentFileModalProps & {
  record: Pick<Document, 'id' | 'name'>
}) {
  const t = useTranslations('documents.removeFile')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [removeError, setRemoveError] = useState<unknown>(null)

  const { mutateAsync: removeFile, isPending } = useDeleteDocumentsIdFile()

  async function handleConfirm() {
    setRemoveError(null)

    try {
      await removeFile({ id: record.id })
    } catch (error) {
      setRemoveError(error)
      // The file may have been removed elsewhere (404): refresh both caches
      // so the screen stops offering a file that no longer exists.
      void queryClient.invalidateQueries({
        queryKey: getGetDocumentsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetDocumentsQueryKey(),
      })
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetDocumentsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetDocumentsQueryKey(),
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
