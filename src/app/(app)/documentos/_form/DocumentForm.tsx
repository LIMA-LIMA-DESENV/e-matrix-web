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

import { Button, Card, Input, Label } from '@/components/ui'
import type { DocumentFile } from '@/http/api'

import { DocumentFileField } from './DocumentFileField'
import {
  type DocumentFileRejection,
  MAX_DOCUMENT_FILE_SIZE_MB,
  validateDocumentFile,
} from './file-validation'
import { MaterialSelector } from './MaterialSelector'
import {
  type DocumentFormData,
  documentFormDefaultValues,
  MAX_FIELD_LENGTH,
  makeDocumentSchema,
  type Translate,
} from './schema'

const LIST_HREF = '/documentos'

const inputClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

function Field({
  label,
  htmlFor,
  error,
  help,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
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

interface DocumentFormProps {
  mode: 'create' | 'edit'
  initialValues?: DocumentFormData
  /** Edit only: the file already stored. */
  currentFile?: DocumentFile | null
  isSubmitting: boolean
  errorMessage?: string | null
  /** `file` is undefined when nothing was picked, which keeps the current one. */
  onSubmit: (data: DocumentFormData, file?: File) => Promise<void>
  /** Edit only: shows "Excluir" in the action bar. */
  onDelete?: () => void
  /** Edit only: opens the file removal confirmation. */
  onRemoveFile?: () => void
  /** Edit only: downloads the stored file. */
  onDownloadFile?: () => void
  isDownloadingFile?: boolean
}

export function DocumentForm({
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
}: DocumentFormProps) {
  const t = useTranslations('documents.form')
  const tv = useTranslations('documents.validation')
  const td = useTranslations('documents')
  const tc = useTranslations('common')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileRejection, setFileRejection] =
    useState<DocumentFileRejection | null>(null)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeDocumentSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? documentFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  const isCreate = mode === 'create'

  const fileError = fileRejection
    ? fileRejection === 'too-large'
      ? tv('fileTooLarge', { max: MAX_DOCUMENT_FILE_SIZE_MB })
      : tv('fileTypeNotAllowed')
    : null

  /**
   * Refuses the file before any request (AC-005, AC-006 on the client) and
   * clears the native input, so a refused file can never be attached by a
   * later submit.
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      setFileRejection(null)
      return
    }

    const rejection = validateDocumentFile(file)

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

  async function handleValid(data: DocumentFormData) {
    // A refused file blocks the submit; it was never kept as the selection.
    if (fileRejection) return

    await onSubmit(data, selectedFile ?? undefined)
  }

  return (
    <form className="space-y-6 pb-32" onSubmit={handleSubmit(handleValid)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={LIST_HREF} className="hover:text-primary">
              {td('title')}
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
          <div className="space-y-2">
            <Label className="ml-1 text-sm font-semibold text-on-surface-variant">
              {t('material')}
            </Label>
            <Controller
              control={control}
              name="material"
              render={({ field }) => (
                <MaterialSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.material && (
              <p className="text-xs font-medium text-error">
                {errors.material.message}
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
          </div>

          <DocumentFileField
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

      <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-16rem)]">
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
              {td('deleteAction')}
            </Button>
          )}
          <Link
            href={LIST_HREF}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          {/* Disabled while pending: POST /documents is not idempotent, so a
              double click would create two documents (§12). */}
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
