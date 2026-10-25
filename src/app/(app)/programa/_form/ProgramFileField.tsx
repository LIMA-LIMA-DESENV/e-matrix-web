import { useTranslations } from 'next-intl'
import type { ChangeEvent } from 'react'

import { Button, Input, Label } from '@/components/ui'
import type { ProgramFile } from '@/http/api'

import {
  ALLOWED_PROGRAM_FILE_EXTENSIONS_LABEL,
  MAX_PROGRAM_FILE_SIZE_MB,
  PROGRAM_FILE_ACCEPT,
} from './file-validation'

interface ProgramFileFieldProps {
  /** The file already stored, on the edit screen; `null` when there is none. */
  currentFile: ProgramFile | null
  /** The file the user just picked, kept out of the zod schema. */
  selectedFile: File | null
  /** Already translated refusal from `validateProgramFile`. */
  error?: string | null
  disabled?: boolean
  isDownloading?: boolean
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** Edit only: download the stored file. */
  onDownload?: () => void
  /** Edit only: open the removal confirmation (R-11). */
  onRemove?: () => void
}

/**
 * The attachment part of the form: the current file with its own two gestures
 * (download and remove), the picker that replaces it, and the sentence that
 * says a blank field keeps the current file (R-11, FR-014). Replacing and
 * removing are deliberately distinct: blank never means "erase".
 */
export function ProgramFileField({
  currentFile,
  selectedFile,
  error,
  disabled,
  isDownloading,
  onFileChange,
  onDownload,
  onRemove,
}: ProgramFileFieldProps) {
  const t = useTranslations('programs.form')
  const tp = useTranslations('programs')

  return (
    <div className="space-y-3">
      <Label
        htmlFor="file"
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {tp('fields.file')}
      </Label>

      {currentFile && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
          <span
            className="material-symbols-outlined text-xl text-outline"
            aria-hidden
          >
            attach_file
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
              aria-label={tp('downloadFileNamed', { name: currentFile.name })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                download
              </span>
              {isDownloading ? tp('downloading') : tp('downloadFile')}
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
              {t('removeFile')}
            </Button>
          )}
        </div>
      )}

      <Input
        id="file"
        type="file"
        accept={PROGRAM_FILE_ACCEPT}
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
            ? t('fileSelected', { name: selectedFile.name })
            : t('fileHint', {
                extensions: ALLOWED_PROGRAM_FILE_EXTENSIONS_LABEL,
                max: MAX_PROGRAM_FILE_SIZE_MB,
              })}
        </p>
      )}

      {/* A blank field always keeps the current file; erasing it is the
          separate gesture above (R-11, J3). */}
      {currentFile && !selectedFile && (
        <p className="text-xs text-on-surface-variant">{t('fileKeepHint')}</p>
      )}
    </div>
  )
}
