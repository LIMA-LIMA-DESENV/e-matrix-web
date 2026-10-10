'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'

interface ConfirmActionReason {
  label: string
  maxLength: number
  required?: boolean
  placeholder?: string
}

interface ConfirmActionModalProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  pendingLabel?: string
  /** Destructive actions use the error color on the confirm button. */
  destructive?: boolean
  /** Shows a reason field, optional or required. */
  reason?: ConfirmActionReason
  isSubmitting: boolean
  /**
   * False when the action is unavailable (e.g. still checking or blocked):
   * only the cancel button is shown.
   */
  canConfirm?: boolean
  /** Replaces "Cancelar", e.g. "Fechar" when there is nothing to confirm. */
  cancelLabel?: string
  /** Already translated (`translateError`). The modal stays open. */
  errorMessage?: string | null
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void> | void
}

/**
 * Confirmation for list row actions. Buttons are disabled while submitting and
 * a ref blocks double submits.
 */
export function ConfirmActionModal(props: ConfirmActionModalProps) {
  if (!props.open) return null

  // Mounted only while open, so the reason resets on every opening.
  return <ConfirmActionDialog {...props} />
}

function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive = false,
  reason,
  isSubmitting,
  canConfirm = true,
  cancelLabel,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const t = useTranslations('common')
  const titleId = useId()
  const reasonId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const submittingRef = useRef(false)
  const [reasonText, setReasonText] = useState('')

  const isBusy = isSubmitting || submittingRef.current
  const isReasonMissing = Boolean(reason?.required) && !reasonText.trim()

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submittingRef.current) onCancel()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  async function handleConfirm() {
    if (submittingRef.current || isReasonMissing || !canConfirm) return

    submittingRef.current = true
    try {
      await onConfirm(reasonText.trim())
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <>
      <ModalOverlay onClick={isBusy ? undefined : onCancel} />
      <ModalContent
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-w-lg outline-none"
      >
        <ModalHeader>
          <ModalTitle id={titleId}>{title}</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-3">
          <div className="text-sm text-on-surface-variant">{description}</div>

          {reason && (
            <div className="space-y-1">
              <label
                htmlFor={reasonId}
                className="text-xs font-bold uppercase tracking-wide text-on-surface-variant"
              >
                {reason.label}
                {reason.required ? ' *' : ''}
              </label>
              <textarea
                id={reasonId}
                value={reasonText}
                maxLength={reason.maxLength}
                placeholder={reason.placeholder}
                disabled={isBusy}
                required={reason.required}
                onChange={(event) => setReasonText(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
              />
              <p className="text-right text-xs text-outline">
                {reasonText.length}/{reason.maxLength}
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
            >
              {errorMessage}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            color="secondary"
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelLabel ?? t('cancel')}
          </Button>
          {canConfirm && (
            <Button
              type="button"
              color={destructive ? 'error' : 'primary'}
              onClick={() => void handleConfirm()}
              disabled={isBusy || isReasonMissing}
            >
              {isBusy && pendingLabel ? pendingLabel : confirmLabel}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </>
  )
}
