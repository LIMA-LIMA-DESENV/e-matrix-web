'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useId, useRef } from 'react'

import {
  Badge,
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import type { Program, ProgramMaterial } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import { toLocalCalendarDate } from '@/lib/periods'

import {
  useProgramMaterialLabel,
  useProgramTypeLabel,
} from './ProgramTypeLabel'
import { countCalendarDaysUntil } from './targetDays'

interface ProgramDetailsModalProps {
  /** The item to show, or `null` while the modal is closed. */
  record: Program | null
  isDownloadingFile: boolean
  /** The material being downloaded, if any. */
  downloadingMaterial: ProgramMaterial | null
  onClose: () => void
  onDownloadFile: (record: Program) => void
  onDownloadMaterial: (material: ProgramMaterial) => void
}

/**
 * Read-only detail of an item (J1, R-9), open from its card and available to
 * every role: every field, the calendar days to the target date, the
 * attachment and the fixed materials of the item's type.
 */
export function ProgramDetailsModal({
  record,
  ...props
}: ProgramDetailsModalProps) {
  if (!record) return null

  return <ProgramDetailsDialog record={record} {...props} />
}

function ProgramDetailsDialog({
  record,
  isDownloadingFile,
  downloadingMaterial,
  onClose,
  onDownloadFile,
  onDownloadMaterial,
}: ProgramDetailsModalProps & { record: Program }) {
  const t = useTranslations('programs')
  const tc = useTranslations('common')
  const format = useFormatter()
  const formatDateOnly = useFormatDateOnly()
  const typeLabel = useProgramTypeLabel()
  const materialLabel = useProgramMaterialLabel()
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

  const days = countCalendarDaysUntil(record.target_date, toLocalCalendarDate())
  const daysText =
    days === null
      ? null
      : days > 0
        ? t('days.remaining', { count: days })
        : days < 0
          ? t('days.passed', { count: -days })
          : t('days.today')

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

  /** Plain text (R-4, AC-007): a React text node, so typed markup shows
      literally, and `pre-wrap` keeps the line breaks the user wrote. */
  function renderPlainText(value: string) {
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
          <ModalTitle id={titleId}>{typeLabel(record.type)}</ModalTitle>
        </ModalHeader>

        <ModalBody className="max-h-[70vh] overflow-y-auto">
          <dl className="grid gap-4 sm:grid-cols-2">
            {renderField(
              t('fields.question'),
              renderPlainText(record.question),
              true
            )}
            {renderField(
              t('fields.description'),
              renderPlainText(record.description),
              true
            )}
            {renderField(
              t('fields.actions'),
              renderPlainText(record.actions),
              true
            )}
            {renderField(
              t('fields.responsible'),
              <span className="break-words">{record.responsible}</span>
            )}
            {renderField(
              t('fields.targetDate'),
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  {formatDateOnly(record.target_date) ?? tc('emptyValue')}
                </span>
                {daysText && (
                  <span className="text-xs font-semibold text-amber-700">
                    {daysText}
                  </span>
                )}
              </span>
            )}
            {renderField(
              t('fields.completedPercentage'),
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  {format.number(record.completed_percentage / 100, {
                    style: 'percent',
                    maximumFractionDigits: 0,
                  })}
                </span>
                {record.completed_percentage === 100 && (
                  <Badge color="success">{t('complete')}</Badge>
                )}
              </span>,
              true
            )}

            {renderField(
              t('fields.file'),
              record.file ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="break-all">{record.file.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    color="primary"
                    onClick={() => onDownloadFile(record)}
                    disabled={isDownloadingFile}
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
                    {isDownloadingFile ? t('downloading') : t('downloadFile')}
                  </Button>
                </div>
              ) : (
                <span className="text-on-surface-variant">{t('noFile')}</span>
              ),
              true
            )}

            {/* Fixed materials of the type (R-13): the API lists them, so an
                item of another type shows nothing here. */}
            {record.materials.length > 0 &&
              renderField(
                t('fields.materials'),
                <ul className="flex flex-col gap-2">
                  {record.materials.map((material) => (
                    <li
                      key={material}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <span>{materialLabel(material)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        color="primary"
                        onClick={() => onDownloadMaterial(material)}
                        disabled={downloadingMaterial !== null}
                        aria-label={t('downloadMaterialNamed', {
                          name: materialLabel(material),
                        })}
                      >
                        <span
                          className="material-symbols-outlined text-base"
                          aria-hidden
                        >
                          download
                        </span>
                        {downloadingMaterial === material
                          ? t('downloading')
                          : t('downloadMaterial')}
                      </Button>
                    </li>
                  ))}
                </ul>,
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
