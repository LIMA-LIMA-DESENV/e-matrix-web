'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useId, useMemo, useRef } from 'react'

import { PhotoPreview } from '@/components/files'

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import type { ImprovementProject } from '@/http/api'
import {
  fetchImprovementProjectPhoto,
  IMPROVEMENT_PROJECT_PHOTO_FIELDS,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'
import { useFormatDateOnly } from '@/lib/format-date'

import { formatProjectActivity, IMPROVEMENT_PROJECT_PHOTOS } from './listing'
import { ProjectCodeBadge } from './ProjectCodeBadge'
import { SCOPE_TYPES } from './types'

interface ImprovementProjectDetailsModalProps {
  /** The project to show, or `null` while the modal is closed. */
  record: ImprovementProject | null
  /** Photo of this project being downloaded, if any. */
  downloadingPhoto: ImprovementProjectPhotoKey | null
  onClose: () => void
  onDownloadPhoto: (
    record: ImprovementProject,
    photo: ImprovementProjectPhotoKey
  ) => void
  /** Whether a PDF is being generated, this one or another (D-12). */
  isGeneratingPdf: boolean
  onDownloadPdf: (record: ImprovementProject) => void
}

/**
 * Read-only detail of a project register, RGP or RGA (J5, FR-037), open from
 * the listing row and available to every role, with the thumbnails of the
 * photos, their downloads and the PDF of the record (J6).
 */
export function ImprovementProjectDetailsModal({
  record,
  ...props
}: ImprovementProjectDetailsModalProps) {
  if (!record) return null

  return <ImprovementProjectDetailsDialog record={record} {...props} />
}

function ImprovementProjectDetailsDialog({
  record,
  downloadingPhoto,
  onClose,
  onDownloadPhoto,
  isGeneratingPdf,
  onDownloadPdf,
}: ImprovementProjectDetailsModalProps & { record: ImprovementProject }) {
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // One stable loader per photo, renewed only with the record, so a
  // thumbnail loads again exactly when the record it shows changes.
  const photoLoaders = useMemo(
    (): Record<
      ImprovementProjectPhotoKey,
      (signal: AbortSignal) => Promise<Blob | null>
    > => ({
      'before-photo': (signal) =>
        fetchImprovementProjectPhoto(record, 'before-photo', signal),
      'after-photo': (signal) =>
        fetchImprovementProjectPhoto(record, 'after-photo', signal),
    }),
    [record]
  )

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
  // literally, and `pre-wrap` keeps the line breaks the user wrote.
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
          <ModalTitle id={titleId}>{t('details.title')}</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            {renderField(
              t('columns.code'),
              <ProjectCodeBadge code={record.code} />
            )}
            {renderField(
              t('columns.type'),
              t(`types.${SCOPE_TYPES[record.scope]}`)
            )}
            {renderField(
              t('columns.activity'),
              formatProjectActivity(record.activity),
              true
            )}
            {renderField(
              t('columns.date'),
              formatDateOnly(record.date) ?? tc('emptyValue')
            )}
            {renderField(t('columns.priority'), renderText(record.priority))}
            {renderField(
              t('columns.concern'),
              renderText(record.concern),
              true
            )}
            {renderField(
              t('columns.recommendation'),
              renderText(record.improvement_recommendation),
              true
            )}

            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-outline">
                {t('details.photos')}
              </dt>
              <dd className="mt-2 grid gap-4 sm:grid-cols-2">
                {IMPROVEMENT_PROJECT_PHOTOS.map(({ key, label }) => {
                  const file = record[IMPROVEMENT_PROJECT_PHOTO_FIELDS[key]]
                  const photoLabel = t(label)

                  return (
                    <figure key={key} className="min-w-0 space-y-2">
                      <figcaption className="text-xs font-semibold text-on-surface-variant">
                        {photoLabel}
                      </figcaption>

                      {file ? (
                        <>
                          <PhotoPreview
                            key={`${record.id}:${key}`}
                            load={photoLoaders[key]}
                            alt={t('details.photoAlt', {
                              photo: photoLabel,
                              code: record.code,
                              name: file.name,
                            })}
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="min-w-0 flex-1 break-all text-xs text-on-surface-variant">
                              {file.name}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              color="primary"
                              onClick={() => onDownloadPhoto(record, key)}
                              disabled={downloadingPhoto !== null}
                              aria-label={t('downloadPhotoNamed', {
                                photo: photoLabel,
                                name: file.name,
                              })}
                            >
                              <span
                                className="material-symbols-outlined text-base"
                                aria-hidden
                              >
                                download
                              </span>
                              {downloadingPhoto === key
                                ? t('downloading')
                                : t('downloadPhoto')}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-outline-variant text-xs font-medium text-on-surface-variant">
                          {t('details.noPhoto')}
                        </div>
                      )}
                    </figure>
                  )
                })}
              </dd>
            </div>
          </dl>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            color="primary"
            onClick={() => onDownloadPdf(record)}
            disabled={isGeneratingPdf}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              picture_as_pdf
            </span>
            {isGeneratingPdf ? t('pdf.generating') : t('pdf.download')}
          </Button>
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
