'use client'

import { useFormatter, useTranslations } from 'next-intl'
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
import type { Document } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { DocumentMaterialBadge } from './DocumentMaterialBadge'

interface DocumentDetailsModalProps {
  /** The document to show, or `null` while the modal is closed. */
  record: Document | null
  isDownloading: boolean
  onClose: () => void
  onDownloadFile: (record: Document) => void
}

/**
 * Read-only detail of a document (J2, D-15), open from the listing row and
 * available to every role — the Viewer's path to the full record, since the
 * edit form is not theirs.
 */
export function DocumentDetailsModal({
  record,
  ...props
}: DocumentDetailsModalProps) {
  if (!record) return null

  return <DocumentDetailsDialog record={record} {...props} />
}

function DocumentDetailsDialog({
  record,
  isDownloading,
  onClose,
  onDownloadFile,
}: DocumentDetailsModalProps & { record: Document }) {
  const t = useTranslations('documents')
  const tc = useTranslations('common')
  const format = useFormatter()
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

  function formatInstant(value: string) {
    return value
      ? format.dateTime(new Date(value), {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : tc('emptyValue')
  }

  function renderField(label: string, value: ReactNode) {
    return (
      <div>
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
              t('columns.material'),
              <DocumentMaterialBadge material={record.material} />
            )}
            {renderField(t('columns.name'), record.name)}
            {renderField(t('columns.responsible'), record.responsible)}
            {renderField(
              t('columns.date'),
              formatDateOnly(record.date) ?? tc('emptyValue')
            )}
            {renderField(
              t('columns.createdAt'),
              formatInstant(record.created_at)
            )}
            {renderField(
              t('columns.updatedAt'),
              formatInstant(record.updated_at)
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
