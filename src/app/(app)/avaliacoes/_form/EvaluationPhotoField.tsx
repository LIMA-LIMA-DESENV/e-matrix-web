'use client'

import { useTranslations } from 'next-intl'
import { type ChangeEvent, type MouseEvent, useMemo } from 'react'

import { PhotoPreview } from '@/components/files'
import { Button, Input, Label } from '@/components/ui'
import {
  checkFile,
  type FileRejection,
  formatFileExtensions,
  PHOTO_POLICY,
} from '@/lib/file-policy'

import type { EvaluationFormPhoto } from '../definitions/types'

/**
 * The photo picked in the form, kept out of react-hook-form (D-7): the file
 * that passed `checkFile(PHOTO_POLICY)`, or why the last one was refused.
 */
export interface EvaluationPhotoSelection {
  file: File | null
  rejection: FileRejection | null
}

export const NO_PHOTO_SELECTION: EvaluationPhotoSelection = {
  file: null,
  rejection: null,
}

interface EvaluationPhotoFieldProps {
  /** The id of the picker, also its label's `htmlFor`. */
  id: string
  /** The field's name, e.g. "Imagem do setor", also the thumbnail's `alt`. */
  label: string
  /** The stored photo (view and edit); `null` or absent when there is none. */
  currentPhoto?: EvaluationFormPhoto | null
  selection: EvaluationPhotoSelection
  onSelectionChange(selection: EvaluationPhotoSelection): void
  /** The view (J2): only the thumbnail and "Baixar foto", or "Sem foto". */
  readOnly?: boolean
  isDownloading?: boolean
  /** Downloads the stored photo. */
  onDownload?(): void
  /** Edit only: opens the confirmation of the removal (R-9, D-7). */
  onRemove?(): void
}

/**
 * The photo of an evaluation (FR-024): a JPEG or PNG picker checked on the
 * choice, with the refusal next to it, never selected, so it is never sent
 * (R-7); the thumbnail of the photo picked or else of the stored one, its
 * name, "Baixar foto" and, on the edit, "Remover foto". A blank picker keeps
 * the stored photo (R-8). The view shows only the thumbnail and "Baixar
 * foto", or "Sem foto".
 */
export function EvaluationPhotoField({
  id,
  label,
  currentPhoto = null,
  selection,
  onSelectionChange,
  readOnly = false,
  isDownloading = false,
  onDownload,
  onRemove,
}: EvaluationPhotoFieldProps) {
  const t = useTranslations('evaluations.photoField')
  const { file, rejection } = selection
  const extensions = formatFileExtensions(PHOTO_POLICY)

  // A stable loader per picked file: `PhotoPreview` shows it from memory and
  // revokes its object URL when another file replaces it.
  const loadSelected = useMemo(
    () => (file ? () => Promise.resolve<Blob | null>(file) : null),
    [file]
  )

  /**
   * Refuses a photo before any request (R-7) and clears the native input,
   * so a refused file can never be attached by a later submit and the same
   * file can be picked again once fixed.
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null
    const refusal = picked ? checkFile(picked, PHOTO_POLICY) : null

    if (refusal) event.target.value = ''

    onSelectionChange({
      file: refusal ? null : picked,
      rejection: refusal,
    })
  }

  // The form's disabled fieldset (the view) disables every button, so the
  // download is a link, which a fieldset never disables: it must work read
  // only too.
  function handleDownload(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (!isDownloading) onDownload?.()
  }

  const error = rejection
    ? rejection === 'too-large'
      ? t('tooLarge', { max: PHOTO_POLICY.maxMegabytes })
      : t('typeNotAllowed', { extensions })
    : null

  function thumbnail() {
    if (loadSelected && file) {
      return (
        <PhotoPreview
          key={`selected:${file.name}:${file.size}:${file.lastModified}`}
          load={loadSelected}
          alt={label}
        />
      )
    }

    if (currentPhoto) {
      return (
        <PhotoPreview
          key={`current:${currentPhoto.name}`}
          load={currentPhoto.load}
          alt={label}
        />
      )
    }

    if (!readOnly) return null

    return (
      <div className="flex h-40 w-full items-center justify-center rounded-lg bg-surface-container-low px-4 text-center text-xs font-medium text-on-surface-variant">
        {t('none')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {readOnly ? (
        <p className="ml-1 text-sm font-semibold text-on-surface-variant">
          {label}
        </p>
      ) : (
        <Label
          htmlFor={id}
          className="ml-1 text-sm font-semibold text-on-surface-variant"
        >
          {label}
        </Label>
      )}

      <div className="max-w-sm">{thumbnail()}</div>

      {currentPhoto && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
          <span
            className="material-symbols-outlined text-xl text-outline"
            aria-hidden
          >
            image
          </span>
          <span className="flex-1 break-all text-sm font-medium text-on-surface">
            {currentPhoto.name}
          </span>

          {onDownload && (
            <a
              href={`#${id}`}
              aria-disabled={isDownloading || undefined}
              aria-label={t('downloadNamed', { name: currentPhoto.name })}
              onClick={handleDownload}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-primary px-3 font-label text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-on-primary aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                download
              </span>
              {isDownloading ? t('downloading') : t('download')}
            </a>
          )}

          {!readOnly && onRemove && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="error"
              onClick={onRemove}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                delete
              </span>
              {t('remove')}
            </Button>
          )}
        </div>
      )}

      {!readOnly && (
        <>
          <Input
            id={id}
            type="file"
            accept={PHOTO_POLICY.accept}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help`}
            onChange={handleChange}
            className="h-auto cursor-pointer rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:font-label file:text-xs file:font-semibold file:text-on-primary-container"
          />

          {error ? (
            <p
              id={`${id}-help`}
              role="alert"
              className="text-xs font-medium text-error"
            >
              {error}
            </p>
          ) : (
            <p id={`${id}-help`} className="text-xs text-on-surface-variant">
              {file
                ? t('selected', { name: file.name })
                : t('hint', { extensions, max: PHOTO_POLICY.maxMegabytes })}
            </p>
          )}

          {/* A blank picker keeps the stored photo; erasing it is the
              separate gesture above (R-8, D-7). */}
          {currentPhoto && !file && (
            <p className="text-xs text-on-surface-variant">{t('keepHint')}</p>
          )}
        </>
      )}
    </div>
  )
}
