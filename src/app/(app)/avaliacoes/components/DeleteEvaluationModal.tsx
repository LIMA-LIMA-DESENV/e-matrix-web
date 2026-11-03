'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import { useTranslateError } from '@/lib/error-translator'

type EvaluationRef = { id: string; code: string }

interface DeleteEvaluationModalProps {
  /** The record to delete; `null` keeps the modal closed. */
  record: EvaluationRef | null
  /** Deletes through the API; a rejection is shown translated. */
  onConfirm: (record: EvaluationRef) => Promise<void>
  onClose: () => void
  onDeleted: (record: EvaluationRef) => void
}

/**
 * Confirms the deletion of an evaluation, citing its code and warning that
 * it is final (R-14, FR-016). Offered only on the listing (D-7, H-3). The
 * confirm button stays disabled while the DELETE is pending.
 */
export function DeleteEvaluationModal(props: DeleteEvaluationModalProps) {
  if (!props.record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteEvaluationDialog
      key={props.record.id}
      {...props}
      record={props.record}
    />
  )
}

function DeleteEvaluationDialog({
  record,
  onConfirm,
  onClose,
  onDeleted,
}: DeleteEvaluationModalProps & { record: EvaluationRef }) {
  const t = useTranslations('evaluations.delete')
  const translateError = useTranslateError()
  const [isPending, setIsPending] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)

  async function handleConfirm() {
    if (isPending) return
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
