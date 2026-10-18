import { useTranslations } from 'next-intl'
import type { ChangeEvent } from 'react'

import { Button, Input, Label } from '@/components/ui'
import type { MeetingFile } from '@/http/api'
import {
  MEETING_ATTACHMENT_FIELDS,
  type MeetingAttachmentKey,
} from '@/lib/download-file'

import {
  ALLOWED_MEETING_FILE_EXTENSIONS_LABEL,
  MAX_MEETING_FILE_SIZE_MB,
  MEETING_FILE_ACCEPT,
} from './file-validation'

interface MeetingFileFieldProps {
  /** Which of the two attachments this field is (D-13). */
  attachment: MeetingAttachmentKey
  /** The file already stored, on the edit screen; `null` if none. */
  currentFile: MeetingFile | null
  /** The file the user just picked, kept out of the zod schema. */
  selectedFile: File | null
  /** Already translated refusal from `validateMeetingFile`. */
  error?: string | null
  disabled?: boolean
  isDownloading?: boolean
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** Edit only: download the stored file. */
  onDownload?: () => void
  /** Edit only: open the removal confirmation of this attachment (R-18). */
  onRemove?: () => void
}

/**
 * One attachment of the form, used twice — the attendance list and the
 * minutes: the current file with its own two gestures (download and remove),
 * the picker that replaces it, and the sentence that says a blank field keeps
 * the current file (R-16). Replacing and removing are deliberately distinct:
 * blank never means "erase" (D-11), and each field touches only its own
 * attachment (R-17).
 */
export function MeetingFileField({
  attachment,
  currentFile,
  selectedFile,
  error,
  disabled,
  isDownloading,
  onFileChange,
  onDownload,
  onRemove,
}: MeetingFileFieldProps) {
  const t = useTranslations('meetings.form')
  const tm = useTranslations('meetings')
  // The multipart part name doubles as the input id: unique on the page.
  const inputId = MEETING_ATTACHMENT_FIELDS[attachment]
  const label = tm(`attachments.${attachment}`)

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
              aria-label={tm('downloadFileNamed', {
                attachment: label,
                name: currentFile.name,
              })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                download
              </span>
              {isDownloading ? tm('downloading') : tm('downloadFile')}
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
              {t(`removeFile.${attachment}`)}
            </Button>
          )}
        </div>
      )}

      <Input
        id={inputId}
        type="file"
        accept={MEETING_FILE_ACCEPT}
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
                extensions: ALLOWED_MEETING_FILE_EXTENSIONS_LABEL,
                max: MAX_MEETING_FILE_SIZE_MB,
              })}
        </p>
      )}

      {/* A blank field always keeps the current file; erasing it is the
          separate gesture above (R-16, R-18, J8). */}
      {currentFile && !selectedFile && (
        <p className="text-xs text-on-surface-variant">
          {t(`fileKeepHint.${attachment}`)}
        </p>
      )}
    </div>
  )
}
