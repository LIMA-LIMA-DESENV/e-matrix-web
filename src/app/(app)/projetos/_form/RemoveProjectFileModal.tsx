import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import { useTranslateError } from '@/lib/error-translator'

interface RemoveProjectFileModalProps {
  /** Code of the record whose attachment to remove; `null` keeps it closed. */
  code: string | null
  /** Translated name of the attachment, e.g. "Foto antes"; `null` keeps it closed. */
  fileLabel: string | null
  /**
   * Removes the attachment through the API and updates the caches. A
   * rejection is shown translated and keeps the modal open.
   */
  onConfirm: () => Promise<void>
  onClose: () => void
}

/**
 * Explicit confirmation for removing **one** attachment of a project record
 * (R-19, J11). The modal names the attachment and the record, because the
 * removal keeps no copy; the record and its other attachments stay. The call
 * itself belongs to the screen, so the same modal serves the photos of an
 * RGP/RGA and the receipt form of an RA.
 */
export function RemoveProjectFileModal({
  code,
  fileLabel,
  onConfirm,
  onClose,
}: RemoveProjectFileModalProps) {
  if (!code || !fileLabel) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveProjectFileDialog
      key={`${code}:${fileLabel}`}
      code={code}
      fileLabel={fileLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

function RemoveProjectFileDialog({
  code,
  fileLabel,
  onConfirm,
  onClose,
}: RemoveProjectFileModalProps & { code: string; fileLabel: string }) {
  const t = useTranslations('projects.removeFile')
  const translateError = useTranslateError()
  const [isPending, setIsPending] = useState(false)
  const [removeError, setRemoveError] = useState<unknown>(null)

  async function handleConfirm() {
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
      title={t('title', { file: fileLabel })}
      description={
        <div className="space-y-3">
          <p>{t.rich('question', { file: fileLabel, code, strong })}</p>
          <p>{t('description')}</p>
        </div>
      }
      confirmLabel={t('confirm', { file: fileLabel })}
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
