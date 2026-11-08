'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import { useTranslateError } from '@/lib/error-translator'

interface RemoveEvaluationPhotoModalProps {
  /** Code of the record whose photo to remove; `null` keeps it closed. */
  code: string | null
  /**
   * Removes the photo through the API and refreshes the caches. A rejection
   * is shown translated and keeps the modal open.
   */
  onConfirm: () => Promise<void>
  onClose: () => void
}

/**
 * Explicit confirmation for removing the photo of an evaluation (R-9, D-7).
 * It cites the record and says the record stays, the photo cannot be
 * recovered and the other fields are not saved now. The confirm button
 * stays disabled while the `DELETE` is pending.
 */
export function RemoveEvaluationPhotoModal(
  props: RemoveEvaluationPhotoModalProps
) {
  if (!props.code) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveEvaluationPhotoDialog
      key={props.code}
      {...props}
      code={props.code}
    />
  )
}

function RemoveEvaluationPhotoDialog({
  code,
  onConfirm,
  onClose,
}: RemoveEvaluationPhotoModalProps & { code: string }) {
  const t = useTranslations('evaluations.removePhoto')
  const translateError = useTranslateError()
  const [isPending, setIsPending] = useState(false)
  const [removeError, setRemoveError] = useState<unknown>(null)

  async function handleConfirm() {
    if (isPending) return
    setRemoveError(null)
    setIsPending(true)

    try {
      await onConfirm()
    } catch (error) {
      setRemoveError(error)
    } finally {
      setIsPending(false)
    }
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
          <p>{t.rich('question', { code, strong })}</p>
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
