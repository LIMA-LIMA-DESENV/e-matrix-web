import { useTranslations } from 'next-intl'
import type { ChangeEvent } from 'react'

import { Button, Input, Label } from '@/components/ui'
import type { ProjectFile } from '@/http/api'

import {
  formatProjectFileExtensions,
  type ProjectFilePolicy,
} from './file-validation'

interface ProjectFileFieldProps {
  /** The multipart part name, which doubles as the input id. */
  inputId: string
  /** Translated name of the attachment, e.g. "Foto antes". */
  label: string
  policy: ProjectFilePolicy
  /** The file already stored, on the edit screen; `null` if none. */
  currentFile: ProjectFile | null
  /** The file the user just picked, kept out of the zod schema. */
  selectedFile: File | null
  /** Already translated refusal from `validateProjectFile`. */
  error?: string | null
  /** Translated "blank keeps the current file" sentence of this attachment. */
  keepHint: string
  /** Translated label of the remove button of this attachment. */
  removeLabel: string
  /** Material symbol of the stored file; a photo by default. */
  icon?: string
  /**
   * Translated sentence under an empty picker; by default the photo one,
   * which says any dimension is accepted.
   */
  hint?: string
  disabled?: boolean
  isDownloading?: boolean
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** Edit only: download the stored file. */
  onDownload?: () => void
  /** Edit only: open the removal confirmation of this attachment (R-19). */
  onRemove?: () => void
}

/**
 * One attachment of a projects form — each photo of an RGP/RGA and the
 * receipt form of an RA: the current
 * file with its own two gestures (download and remove), the picker that
 * replaces it, and the sentence that says a blank field keeps the current
 * file (R-18). Replacing and removing are deliberately distinct: blank never
 * means "erase", and each field touches only its own attachment.
 */
export function ProjectFileField({
  inputId,
  label,
  policy,
  currentFile,
  selectedFile,
  error,
  keepHint,
  removeLabel,
  icon = 'image',
  hint,
  disabled,
  isDownloading,
  onFileChange,
  onDownload,
  onRemove,
}: ProjectFileFieldProps) {
  const t = useTranslations('projects')

  return (
    <div className="space-y-3">
      <Label
        htmlFor={inputId}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {label}
      </Label>

      {currentFile && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
          <span
            className="material-symbols-outlined text-xl text-outline"
            aria-hidden
          >
            {icon}
          </span>
          <span className="flex-1 break-all text-sm font-medium text-on-surface">
            {currentFile.name}
          </span>

          {onDownload && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="primary"
              onClick={onDownload}
              disabled={isDownloading}
              aria-label={t('form.downloadFileNamed', {
                file: label,
                name: currentFile.name,
              })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                download
              </span>
              {isDownloading ? t('downloading') : t('form.downloadFile')}
            </Button>
          )}

          {onRemove && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="error"
              onClick={onRemove}
              disabled={disabled}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                delete
              </span>
              {removeLabel}
            </Button>
          )}
        </div>
      )}

      <Input
        id={inputId}
        type="file"
        accept={policy.accept}
        disabled={disabled}
        onChange={onFileChange}
        className="h-auto cursor-pointer rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:font-label file:text-xs file:font-semibold file:text-on-primary-container"
      />

      {error ? (
        <p role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : (
        <p className="text-xs text-on-surface-variant">
          {selectedFile
            ? t('form.fileSelected', { name: selectedFile.name })
            : (hint ??
              t('form.fileHint', {
                extensions: formatProjectFileExtensions(policy),
                max: policy.maxMegabytes,
              }))}
        </p>
      )}

      {/* A blank field always keeps the current file; erasing it is the
          separate gesture above (R-18, J10). */}
      {currentFile && !selectedFile && (
        <p className="text-xs text-on-surface-variant">{keepHint}</p>
      )}
    </div>
  )
}
