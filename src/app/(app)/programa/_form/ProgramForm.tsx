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
import { useForm } from 'react-hook-form'

import { Button, Card, Input, inputVariants, Label } from '@/components/ui'
import type { ProgramFile } from '@/http/api'

import { useProgramTypeLabel } from '../components/ProgramTypeLabel'
import {
  MAX_PROGRAM_FILE_SIZE_MB,
  type ProgramFileRejection,
  validateProgramFile,
} from './file-validation'
import { ProgramFileField } from './ProgramFileField'
import {
  MAX_FIELD_LENGTH,
  MAX_TEXT_LENGTH,
  makeProgramSchema,
  PROGRAM_TYPES,
  type ProgramFormData,
  type ProgramFormValues,
  programFormDefaultValues,
  type Translate,
} from './schema'

const LIST_HREF = '/programa'

const inputClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

const textareaClasses = inputVariants({
  className:
    'h-auto resize-y rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20',
})

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
    <div className={`space-y-2 ${className ?? ''}`}>
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

interface ProgramFormProps {
  mode: 'create' | 'edit'
  initialValues?: ProgramFormValues
  /** Edit only: the file already stored. */
  currentFile?: ProgramFile | null
  isSubmitting: boolean
  errorMessage?: string | null
  /** `file` is undefined when nothing was picked, which keeps the current one. */
  onSubmit: (data: ProgramFormData, file?: File) => Promise<void>
  /** Edit only: shows "Excluir" in the action bar. */
  onDelete?: () => void
  /** Edit only: opens the file removal confirmation. */
  onRemoveFile?: () => void
  /** Edit only: downloads the stored file. */
  onDownloadFile?: () => void
  isDownloadingFile?: boolean
}

/**
 * Shared form of `/programa/novo` and `/programa/{id}/editar` (FR-020), in the
 * mould of `DocumentForm`: the seven fields of R-1 validated by zod before any
 * request, and the optional attachment checked by `validateProgramFile`.
 * Description and actions are plain multi-line text (R-4).
 */
export function ProgramForm({
  mode,
  initialValues,
  currentFile = null,
  isSubmitting,
  errorMessage,
  onSubmit,
  onDelete,
  onRemoveFile,
  onDownloadFile,
  isDownloadingFile,
}: ProgramFormProps) {
  const t = useTranslations('programs.form')
  const tv = useTranslations('programs.validation')
  const tp = useTranslations('programs')
  const tc = useTranslations('common')
  const typeLabel = useProgramTypeLabel()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileRejection, setFileRejection] =
    useState<ProgramFileRejection | null>(null)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeProgramSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues, unknown, ProgramFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? programFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  const isCreate = mode === 'create'

  const fileError = fileRejection
    ? fileRejection === 'too-large'
      ? tv('fileTooLarge', { max: MAX_PROGRAM_FILE_SIZE_MB })
      : tv('fileTypeNotAllowed')
    : null

  /**
   * Refuses the file before any request (AC-008 on the client) and clears the
   * native input, so a refused file can never be attached by a later submit.
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      setFileRejection(null)
      return
    }

    const rejection = validateProgramFile(file)

    if (rejection) {
      setSelectedFile(null)
      setFileRejection(rejection)
      // Clearing the input lets the user pick the same file again after
      // fixing it, and keeps a refused file out of the next submit.
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    setFileRejection(null)
  }

  async function handleValid(data: ProgramFormData) {
    // A refused file blocks the submit; it was never kept as the selection.
    if (fileRejection) return

    await onSubmit(data, selectedFile ?? undefined)
  }

  return (
    // `noValidate`: the zod messages, translated, replace the browser's own
    // bubbles (the number field would otherwise refuse 50.5 in its locale).
    <form
      noValidate
      className="space-y-6 pb-32"
      onSubmit={handleSubmit(handleValid)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={LIST_HREF} className="hover:text-primary">
              {tp('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{isCreate ? t('newTitle') : t('editTitle')}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {isCreate ? t('newTitle') : t('editTitle')}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate ? t('newDescription') : t('editDescription')}
          </p>
        </div>
        <Link
          href={LIST_HREF}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field
              label={t('type')}
              htmlFor="type"
              error={errors.type?.message}
              className="md:col-span-2"
            >
              <select
                id="type"
                disabled={isSubmitting}
                className={inputVariants({
                  className: `${inputClasses} w-full cursor-pointer text-sm text-on-surface`,
                })}
                {...register('type')}
              >
                <option value="">{t('typePlaceholder')}</option>
                {PROGRAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={tp('fields.question')}
              htmlFor="question"
              error={errors.question?.message}
              help={tv('textHint', { max: MAX_FIELD_LENGTH })}
              className="md:col-span-2"
            >
              <Input
                id="question"
                placeholder={t('questionPlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('question')}
              />
            </Field>

            <Field
              label={tp('fields.description')}
              htmlFor="description"
              error={errors.description?.message}
              help={tv('multilineHint', { max: MAX_TEXT_LENGTH })}
              className="md:col-span-2"
            >
              <textarea
                id="description"
                rows={5}
                placeholder={t('descriptionPlaceholder')}
                disabled={isSubmitting}
                className={textareaClasses}
                {...register('description')}
              />
            </Field>

            <Field
              label={tp('fields.actions')}
              htmlFor="actions"
              error={errors.actions?.message}
              help={tv('multilineHint', { max: MAX_TEXT_LENGTH })}
              className="md:col-span-2"
            >
              <textarea
                id="actions"
                rows={5}
                placeholder={t('actionsPlaceholder')}
                disabled={isSubmitting}
                className={textareaClasses}
                {...register('actions')}
              />
            </Field>

            <Field
              label={tp('fields.responsible')}
              htmlFor="responsible"
              error={errors.responsible?.message}
              help={tv('textHint', { max: MAX_FIELD_LENGTH })}
              className="md:col-span-2"
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
              label={tp('fields.targetDate')}
              htmlFor="target_date"
              error={errors.target_date?.message}
              help={tv('targetDateHint')}
            >
              {/* Calendar day: sent as typed, never through Date. */}
              <Input
                id="target_date"
                type="date"
                disabled={isSubmitting}
                className={inputClasses}
                {...register('target_date')}
              />
            </Field>

            <Field
              label={tp('fields.completedPercentage')}
              htmlFor="completed_percentage"
              error={errors.completed_percentage?.message}
              help={tv('completedPercentageHint')}
            >
              {/* Kept as text: the schema, not the browser, refuses 50.5 and
                  1e2, which a number field accepts (FR-006). */}
              <Input
                id="completed_percentage"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('completed_percentage')}
              />
            </Field>
          </div>

          <ProgramFileField
            currentFile={currentFile}
            selectedFile={selectedFile}
            error={fileError}
            disabled={isSubmitting}
            isDownloading={isDownloadingFile}
            onFileChange={handleFileChange}
            onDownload={onDownloadFile}
            onRemove={onRemoveFile}
          />
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
              {tp('deleteAction')}
            </Button>
          )}
          <Link
            href={LIST_HREF}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          {/* Disabled while pending: POST /programs is not idempotent, so a
              double click would create two items (§12). */}
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
