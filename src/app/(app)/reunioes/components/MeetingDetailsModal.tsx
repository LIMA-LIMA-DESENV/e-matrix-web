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
import type { Meeting } from '@/http/api'
import {
  MEETING_ATTACHMENT_FIELDS,
  type MeetingAttachmentKey,
} from '@/lib/download-file'
import { useFormatDateOnly } from '@/lib/format-date'

import { MEETING_ATTACHMENTS } from './listing'
import { MeetingTypeBadge } from './MeetingTypeBadge'

interface MeetingDetailsModalProps {
  /** The meeting to show, or `null` while the modal is closed. */
  record: Meeting | null
  /** Attachment of this meeting being downloaded, if any. */
  downloadingAttachment: MeetingAttachmentKey | null
  onClose: () => void
  onDownloadFile: (record: Meeting, attachment: MeetingAttachmentKey) => void
}

/**
 * Read-only detail of a meeting (J4, H-4), open from the listing row and
 * available to every role. It is the only place where the subject is read.
 */
export function MeetingDetailsModal({
  record,
  ...props
}: MeetingDetailsModalProps) {
  if (!record) return null

  return <MeetingDetailsDialog record={record} {...props} />
}

function MeetingDetailsDialog({
  record,
  downloadingAttachment,
  onClose,
  onDownloadFile,
}: MeetingDetailsModalProps & { record: Meeting }) {
  const t = useTranslations('meetings')
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

  const attachments = MEETING_ATTACHMENTS.flatMap(({ key, label }) => {
    const file = record[MEETING_ATTACHMENT_FIELDS[key]]
    return file ? [{ key, label: t(label), file }] : []
  })

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
              t('columns.type'),
              <MeetingTypeBadge type={record.type} />,
              true
            )}
            {renderField(t('columns.name'), record.name, true)}
            {renderField(t('columns.responsible'), record.responsible)}
            {renderField(
              t('columns.date'),
              formatDateOnly(record.date) ?? tc('emptyValue')
            )}
            {renderField(t('columns.status'), record.status, true)}

            {/* Plain text (R-5, AC-028): rendered as a React text node, so
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
                {t('details.attachments')}
              </dt>
              <dd className="mt-1 text-sm font-medium text-on-surface">
                {attachments.length > 0 ? (
                  <ul className="space-y-3">
                    {attachments.map(({ key, label, file }) => (
                      <li
                        key={key}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-on-surface-variant">
                            {label}
                          </span>
                          <span className="break-all">{file.name}</span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          color="primary"
                          onClick={() => onDownloadFile(record, key)}
                          disabled={downloadingAttachment !== null}
                          aria-label={t('downloadFileNamed', {
                            attachment: label,
                            name: file.name,
                          })}
                        >
                          <span
                            className="material-symbols-outlined text-base"
                            aria-hidden
                          >
                            download
                          </span>
                          {downloadingAttachment === key
                            ? t('downloading')
                            : t('downloadFile')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-on-surface-variant">
                    {t('noAttachments')}
                  </span>
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
