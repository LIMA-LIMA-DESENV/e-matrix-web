import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  type Document,
  getGetDocumentsIdQueryKey,
  getGetDocumentsQueryKey,
  useDeleteDocumentsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface DeleteDocumentModalProps {
  /** The document to delete; `null` keeps the modal closed. */
  record: Pick<Document, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API deleted it and the list was invalidated. */
  onDeleted: (record: Pick<Document, 'id' | 'name'>) => void
}

/**
 * Confirms a document deletion, warning that it is final (R-15). Unlike
 * activities and periods, there is **no dependency check**: no module points
 * at a document, so deletion is never blocked (FR-015) and nothing has to be
 * fetched before offering the confirmation. A 404 (already deleted in another
 * tab) is shown translated and the list is refreshed.
 */
export function DeleteDocumentModal({
  record,
  onClose,
  onDeleted,
}: DeleteDocumentModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteDocumentDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteDocumentDialog({
  record,
  onClose,
  onDeleted,
}: DeleteDocumentModalProps & { record: Pick<Document, 'id' | 'name'> }) {
  const t = useTranslations('documents.delete')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const { mutateAsync: deleteDocument, isPending } = useDeleteDocumentsId()

  async function handleConfirm() {
    setDeleteError(null)

    try {
      await deleteDocument({ id: record.id })
    } catch (error) {
      setDeleteError(error)
      void queryClient.invalidateQueries({
        queryKey: getGetDocumentsQueryKey(),
      })
      return
    }

    queryClient.removeQueries({
      queryKey: getGetDocumentsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetDocumentsQueryKey(),
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
