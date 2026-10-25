import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import { useTranslateError } from '@/lib/error-translator'

type ProjectRef = { id: string; code: string }

interface DeleteProjectModalProps {
  /** The record to delete; `null` keeps the modal closed. */
  record: ProjectRef | null
  /**
   * Deletes the record through the API and refreshes the listing. A rejection
   * (a 404 when another tab deleted it first) is shown translated and keeps
   * the modal open.
   */
  onConfirm: (record: ProjectRef) => Promise<void>
  onClose: () => void
  /** Called after the deletion succeeded. */
  onDeleted: (record: ProjectRef) => void
}

/**
 * Confirms the deletion of a project record, citing its code and warning that
 * it is final and that its attachments go with it (R-29, J12). Offered only
 * on the listing (D-15) and never blocked: no module points at a project. The
 * call itself belongs to the screen, so the same modal serves RGP, RGA and
 * RA.
 */
export function DeleteProjectModal({
  record,
  onConfirm,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteProjectDialog
      key={record.id}
      record={record}
      onConfirm={onConfirm}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteProjectDialog({
  record,
  onConfirm,
  onClose,
  onDeleted,
}: DeleteProjectModalProps & { record: ProjectRef }) {
  const t = useTranslations('projects.delete')
  const translateError = useTranslateError()
  const [isPending, setIsPending] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)

  async function handleConfirm() {
    setDeleteError(null)
    setIsPending(true)

    try {
      await onConfirm(record)
    } catch (error) {
      setDeleteError(error)
      setIsPending(false)
      return
    }

    setIsPending(false)
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
          <p>{t.rich('question', { code: record.code, strong })}</p>
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
