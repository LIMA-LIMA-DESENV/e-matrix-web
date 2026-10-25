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
import type { MaterialReceipt } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { ProjectCodeBadge } from './ProjectCodeBadge'

interface MaterialReceiptDetailsModalProps {
  /** The receipt to show, or `null` while the modal is closed. */
  record: MaterialReceipt | null
  /** Whether the receipt form is being downloaded. */
  isDownloadingFile: boolean
  onClose: () => void
  onDownloadFile: (record: MaterialReceipt) => void
}

/**
 * Read-only detail of a material receipt (J5, FR-037), open from the listing
 * row and available to every role, with the name of the receipt form and its
 * download.
 */
export function MaterialReceiptDetailsModal({
  record,
  ...props
}: MaterialReceiptDetailsModalProps) {
  if (!record) return null

  return <MaterialReceiptDetailsDialog record={record} {...props} />
}

function MaterialReceiptDetailsDialog({
  record,
  isDownloadingFile,
  onClose,
  onDownloadFile,
}: MaterialReceiptDetailsModalProps & { record: MaterialReceipt }) {
  const t = useTranslations('projects')
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

  // Plain text (R-5): rendered as a React text node, so typed markup shows
  // literally.
  function renderText(value: string) {
    return <p className="whitespace-pre-wrap break-words">{value}</p>
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
        className="max-w-2xl outline-none"
      >
        <ModalHeader>
          <ModalTitle id={titleId}>
            {t('materialReceiptDetails.title')}
          </ModalTitle>
        </ModalHeader>

        <ModalBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            {renderField(
              t('columns.code'),
              <ProjectCodeBadge code={record.code} />
            )}
            {renderField(t('columns.type'), t('types.ra'))}
            {renderField(t('columns.employee'), renderText(record.employee))}
            {renderField(
              t('columns.employeeRegistry'),
              renderText(record.employee_registry)
            )}
            {renderField(
              t('columns.date'),
              formatDateOnly(record.date) ?? tc('emptyValue')
            )}
            {renderField(
              t('materialReceiptDetails.file'),
              record.file ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 break-all">
                    {record.file.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    color="primary"
                    onClick={() => onDownloadFile(record)}
                    disabled={isDownloadingFile}
                    aria-label={t('materialReceiptDetails.downloadFileNamed', {
                      name: record.file.name,
                    })}
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      aria-hidden
                    >
                      download
                    </span>
                    {isDownloadingFile
                      ? t('downloading')
                      : t('materialReceiptDetails.downloadFile')}
                  </Button>
                </div>
              ) : (
                <span className="text-on-surface-variant">
                  {t('materialReceiptDetails.noFile')}
                </span>
              ),
              true
            )}
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
