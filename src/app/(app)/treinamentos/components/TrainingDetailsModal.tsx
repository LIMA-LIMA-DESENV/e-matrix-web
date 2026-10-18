'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useId, useRef } from 'react'

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import type { Training, TrainingContent } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { TrainingContentBadge } from './TrainingContentBadge'

interface TrainingDetailsModalProps {
  /** The training to show, or `null` while the modal is closed. */
  record: Training | null
  isDownloading: boolean
  isDownloadingTemplate: boolean
  onClose: () => void
  onDownloadFile: (record: Training) => void
  onDownloadTemplate: (content: TrainingContent) => void
}

/**
 * Read-only detail of a training (J4), open from the listing row and available
 * to every role. It is the only place where the subject is read.
 */
export function TrainingDetailsModal({
  record,
  ...props
}: TrainingDetailsModalProps) {
  if (!record) return null

  return <TrainingDetailsDialog record={record} {...props} />
}

function TrainingDetailsDialog({
  record,
  isDownloading,
  isDownloadingTemplate,
  onClose,
  onDownloadFile,
  onDownloadTemplate,
}: TrainingDetailsModalProps & { record: Training }) {
  const t = useTranslations('trainings')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  function renderField(label: string, value: ReactNode, wide = false) {
    return (
      <div className={wide ? 'sm:col-span-2' : undefined}>
        <dt className="text-xs font-bold uppercase tracking-wide text-outline">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium text-on-surface">{value}</dd>
      </div>
    )
  }

  return (
    <>
      <ModalOverlay onClick={onClose} />
      <ModalContent
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-w-lg outline-none"
      >
        <ModalHeader>
          <ModalTitle id={titleId}>{t('details.title')}</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            {renderField(
              t('columns.content'),
              <TrainingContentBadge
                content={record.content}
                onDownloadTemplate={onDownloadTemplate}
                isDownloadingTemplate={isDownloadingTemplate}
              />,
              true
            )}
            {renderField(t('columns.name'), record.name, true)}
            {renderField(t('columns.responsible'), record.responsible)}
            {renderField(
              t('columns.date'),
              formatDateOnly(record.date) ?? tc('emptyValue')
            )}
            {renderField(t('columns.status'), record.status, true)}

            {/* Plain text (R-5, AC-030): rendered as a React text node, so
                typed markup shows literally, and `pre-wrap` keeps the line
                breaks the user wrote. */}
            {renderField(
              t('columns.subject'),
              <p className="whitespace-pre-wrap break-words">
                {record.subject}
              </p>,
              true
            )}

            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-outline">
                {t('details.file')}
              </dt>
              <dd className="mt-1 text-sm font-medium text-on-surface">
                {record.file ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="break-all">{record.file.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      color="primary"
                      onClick={() => onDownloadFile(record)}
                      disabled={isDownloading}
                      aria-label={t('downloadFileNamed', {
                        name: record.file.name,
                      })}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        aria-hidden
                      >
                        download
                      </span>
                      {isDownloading ? t('downloading') : t('downloadFile')}
                    </Button>
                  </div>
                ) : (
                  <span className="text-on-surface-variant">{t('noFile')}</span>
                )}
              </dd>
            </div>
          </dl>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            color="secondary"
            onClick={onClose}
          >
            {tc('close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  )
}
