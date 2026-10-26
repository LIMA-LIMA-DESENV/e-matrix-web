'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button, Card, Input, inputVariants, Label } from '@/components/ui'
import type { MeetingFile, Period } from '@/http/api'
import {
  MEETING_ATTACHMENT_FIELDS,
  type MeetingAttachmentKey,
} from '@/lib/download-file'

import { MEETING_ATTACHMENTS } from '../components'
import {
  MAX_MEETING_FILE_SIZE_MB,
  type MeetingFileRejection,
  validateMeetingFile,
} from './file-validation'
import { MeetingFileField } from './MeetingFileField'
import {
  MAX_FIELD_LENGTH,
  MAX_SUBJECT_LENGTH,
  type MeetingFormData,
  makeMeetingSchema,
  meetingFormDefaultValues,
  type Translate,
} from './schema'
import { TypeSelector } from './TypeSelector'

const inputClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

/**
 * The files picked in the form, by multipart part (D-13). An attachment left
 * blank is absent, which keeps the stored one on edit and means "none" on
 * create; it is never an empty `File`.
 */
export type MeetingFormFiles = {
  presence_list?: File
  minutes?: File
}

type PerAttachment<T> = Record<MeetingAttachmentKey, T>

const NO_FILES: PerAttachment<null> = { 'presence-list': null, minutes: null }

function Field({
  label,
  htmlFor,
  error,
  help,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  help?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className ?? 'space-y-2'}>
      <Label
        htmlFor={htmlFor}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : (
        help && <p className="text-xs text-on-surface-variant">{help}</p>
      )}
    </div>
  )
}

interface MeetingFormProps {
  mode: 'create' | 'edit'
  initialValues?: MeetingFormData
  /** Edit only: the two attachments already stored. */
  currentFiles?: PerAttachment<MeetingFile | null>
  /**
   * The registered periods, already loaded: a date outside all of them is
   * refused here, without a request (FR-006, FR-025).
   */
  periods: readonly Period[]
  /** The listing, with the filters the user came from. */
  listHref: string
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (data: MeetingFormData, files: MeetingFormFiles) => Promise<void>
  /** Edit only: shows "Excluir" in the action bar. */
  onDelete?: () => void
  /** Edit only: opens the removal confirmation of one attachment. */
  onRemoveFile?: (attachment: MeetingAttachmentKey) => void
  /** Edit only: downloads one stored attachment. */
  onDownloadFile?: (attachment: MeetingAttachmentKey) => void
  /** Attachment being downloaded, if any. */
  downloadingAttachment?: MeetingAttachmentKey | null
}

/**
 * Create and edit form of a meeting (FR-025), in the pattern of
 * `TrainingForm`, with **two** independent file fields — the attendance list
 * and the minutes (R-13). Each field is validated on its own and refused next
 * to itself; the same file may be picked in both, since they are two separate
 * attachments.
 */
export function MeetingForm({
  mode,
  initialValues,
  currentFiles = NO_FILES,
  periods,
  listHref,
  isSubmitting,
  errorMessage,
  onSubmit,
  onDelete,
  onRemoveFile,
  onDownloadFile,
  downloadingAttachment = null,
}: MeetingFormProps) {
  const t = useTranslations('meetings.form')
  const tv = useTranslations('meetings.validation')
  const tm = useTranslations('meetings')
  const tc = useTranslations('common')
  const [selectedFiles, setSelectedFiles] =
    useState<PerAttachment<File | null>>(NO_FILES)
  const [fileRejections, setFileRejections] =
    useState<PerAttachment<MeetingFileRejection | null>>(NO_FILES)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeMeetingSchema(tv as unknown as Translate, periods),
    [tv, periods]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? meetingFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  const isCreate = mode === 'create'

  function fileError(attachment: MeetingAttachmentKey) {
    const rejection = fileRejections[attachment]
    if (!rejection) return null

    return rejection === 'too-large'
      ? tv('fileTooLarge', { max: MAX_MEETING_FILE_SIZE_MB })
      : tv('fileTypeNotAllowed')
  }

  /**
   * Refuses a file before any request (AC-025), next to its own field, and
   * clears that native input, so a refused file can never be attached by a
   * later submit. The other attachment is left as it was.
   */
  function handleFileChange(
    attachment: MeetingAttachmentKey,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null
    const rejection = file ? validateMeetingFile(file) : null

    if (rejection) {
      // Clearing the input lets the user pick the same file again after
      // fixing it, and keeps a refused file out of the next submit.
      event.target.value = ''
    }

    setSelectedFiles((current) => ({
      ...current,
      [attachment]: rejection ? null : file,
    }))
    setFileRejections((current) => ({ ...current, [attachment]: rejection }))
  }

  async function handleValid(data: MeetingFormData) {
    // A refused file blocks the submit; it was never kept as the selection.
    if (fileRejections['presence-list'] || fileRejections.minutes) return

    // Only the picked attachments become parts: an absent key leaves its part
    // out of the body, so a blank field is never sent as an empty file.
    const files: MeetingFormFiles = {}
    for (const { key } of MEETING_ATTACHMENTS) {
      const file = selectedFiles[key]
      if (file) files[MEETING_ATTACHMENT_FIELDS[key]] = file
    }

    await onSubmit(data, files)
  }

  return (
    <form className="space-y-6 pb-32" onSubmit={handleSubmit(handleValid)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={listHref} className="hover:text-primary">
              {tm('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{isCreate ? t('newTitle') : t('editTitle')}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {isCreate ? t('newTitle') : (initialValues?.name ?? t('editTitle'))}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate ? t('newDescription') : t('editDescription')}
          </p>
        </div>
        <Link
          href={listHref}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high sm:self-auto"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            arrow_back
          </span>
          {tc('back')}
        </Link>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
        >
          {errorMessage}
        </div>
      )}

      <Card className="overflow-hidden rounded-xl border border-outline-variant/20 bg-white p-0 shadow-[0_24px_40px_rgba(0,0,0,0.05)]">
        <div className="h-1.5 w-full bg-primary-container" />
        <div className="space-y-6 p-6 md:p-8">
          <div className="space-y-2">
            <Label className="ml-1 text-sm font-semibold text-on-surface-variant">
              {t('type')}
            </Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <TypeSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.type && (
              <p className="text-xs font-medium text-error">
                {errors.type.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field
              label={t('name')}
              htmlFor="name"
              error={errors.name?.message}
              help={tv('nameHint', { max: MAX_FIELD_LENGTH })}
            >
              <Input
                id="name"
                placeholder={t('namePlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('name')}
              />
            </Field>

            <Field
              label={t('responsible')}
              htmlFor="responsible"
              error={errors.responsible?.message}
            >
              <Input
                id="responsible"
                placeholder={t('responsiblePlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('responsible')}
              />
            </Field>

            <Field
              label={t('date')}
              htmlFor="date"
              error={errors.date?.message}
              help={tv('dateHint')}
            >
              {/* Calendar day: sent as typed, never through Date. */}
              <Input
                id="date"
                type="date"
                disabled={isSubmitting}
                className={inputClasses}
                {...register('date')}
              />
            </Field>

            <Field
              label={t('status')}
              htmlFor="status"
              error={errors.status?.message}
            >
              <Input
                id="status"
                placeholder={t('statusPlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('status')}
              />
            </Field>

            {/* Plain text of several lines (R-5): no editor, no markup. */}
            <Field
              label={t('subject')}
              htmlFor="subject"
              error={errors.subject?.message}
              help={tv('subjectHint', { max: MAX_SUBJECT_LENGTH })}
              className="space-y-2 md:col-span-2"
            >
              <textarea
                id="subject"
                rows={6}
                placeholder={t('subjectPlaceholder')}
                disabled={isSubmitting}
                className={inputVariants({
                  className:
                    'h-auto resize-y rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20',
                })}
                {...register('subject')}
              />
            </Field>
          </div>

          <div className="space-y-6">
            {MEETING_ATTACHMENTS.map(({ key }) => {
              const currentFile = currentFiles[key]

              return (
                <MeetingFileField
                  key={key}
                  attachment={key}
                  currentFile={currentFile}
                  selectedFile={selectedFiles[key]}
                  error={fileError(key)}
                  disabled={isSubmitting}
                  isDownloading={downloadingAttachment === key}
                  onFileChange={(event) => handleFileChange(key, event)}
                  onDownload={
                    onDownloadFile ? () => onDownloadFile(key) : undefined
                  }
                  onRemove={
                    onRemoveFile && currentFile
                      ? () => onRemoveFile(key)
                      : undefined
                  }
                />
              )
            })}
          </div>
        </div>
      </Card>

      <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-var(--shell-sidebar-width,16rem))]">
        <div className="mx-auto flex max-w-6xl justify-end gap-3">
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              color="error"
              onClick={onDelete}
              disabled={isSubmitting}
              className="mr-auto rounded-xl"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                delete
              </span>
              {tm('deleteAction')}
            </Button>
          )}
          <Link
            href={listHref}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          {/* Disabled while pending: POST /meetings is not idempotent, so a
              double click would create two meetings (§12). */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
          >
            {isSubmitting
              ? isCreate
                ? t('creating')
                : tc('saving')
              : isCreate
                ? t('create')
                : t('update')}
          </Button>
        </div>
      </div>
    </form>
  )
}
