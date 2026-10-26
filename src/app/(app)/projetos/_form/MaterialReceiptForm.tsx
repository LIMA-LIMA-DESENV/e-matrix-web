'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'

import { Button, Card, Input, Label } from '@/components/ui'
import type { Period, ProjectFile } from '@/http/api'

import {
  formatProjectFileExtensions,
  MATERIAL_RECEIPT_FILE_POLICY,
  type ProjectFileRejection,
  validateProjectFile,
} from './file-validation'
import { ProjectFileField } from './ProjectFileField'
import {
  MAX_PROJECT_TEXT_LENGTH,
  type MaterialReceiptFormData,
  makeMaterialReceiptSchema,
  materialReceiptFormDefaultValues,
  type Translate,
} from './schema'

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
  help?: ReactNode
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
        help && <div className="text-xs text-on-surface-variant">{help}</div>
      )}
    </div>
  )
}

interface MaterialReceiptFormProps {
  mode: 'create' | 'edit'
  /** Edit only: the record's code, the title of the screen (J10). */
  code?: string
  initialValues?: MaterialReceiptFormData
  /** Edit only: the receipt form already stored, or `null`. */
  currentFile?: ProjectFile | null
  /**
   * The registered periods, already loaded: a date outside all of them is
   * refused here, without a request (FR-035).
   */
  periods: readonly Period[]
  /** The Escritório tab, with the filters the user came from. */
  listHref: string
  isSubmitting: boolean
  errorMessage?: string | null
  /**
   * Sends the form; `file` is absent when the field was left blank. Resolves
   * `true` once saved, when the screen is about to leave: the form then
   * stays locked, so nothing is sent again meanwhile.
   */
  onSubmit: (data: MaterialReceiptFormData, file?: File) => Promise<boolean>
  /** Edit only: opens the removal confirmation of the receipt form. */
  onRemoveFile?: () => void
  /** Edit only: downloads the stored receipt form. */
  onDownloadFile?: () => void
  isDownloadingFile?: boolean
}

/**
 * Create and edit form of a material receipt (J9, J10, FR-035): employee,
 * employee registry, date and the optional receipt form. The file is checked
 * against the legacy types and the 25 MB limit before any request. The
 * deletion is not here: it lives on the listing (D-15).
 */
export function MaterialReceiptForm({
  mode,
  code,
  initialValues,
  currentFile = null,
  periods,
  listHref,
  isSubmitting,
  errorMessage,
  onSubmit,
  onRemoveFile,
  onDownloadFile,
  isDownloadingFile = false,
}: MaterialReceiptFormProps) {
  const t = useTranslations('projects.form')
  const tv = useTranslations('projects.validation')
  const tp = useTranslations('projects')
  const tc = useTranslations('common')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileRejection, setFileRejection] =
    useState<ProjectFileRejection | null>(null)
  const isSendingRef = useRef(false)
  const [isSaved, setIsSaved] = useState(false)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeMaterialReceiptSchema(tv as unknown as Translate, periods),
    [tv, periods]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaterialReceiptFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? materialReceiptFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  const isCreate = mode === 'create'
  const typeLabel = tp('types.ra')
  const fileLabel = tp('materialReceiptDetails.file')
  const textHint = tv('textHint', { max: MAX_PROJECT_TEXT_LENGTH })

  const fileError = fileRejection
    ? fileRejection === 'too-large'
      ? tv('receiptFileTooLarge', {
          max: MATERIAL_RECEIPT_FILE_POLICY.maxMegabytes,
        })
      : tv('receiptFileTypeNotAllowed')
    : null

  /**
   * Refuses a receipt form before any request (AC-026) and clears the native
   * input, so a refused file can never be attached by a later submit.
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    const rejection = file
      ? validateProjectFile(file, MATERIAL_RECEIPT_FILE_POLICY)
      : null

    if (rejection) {
      // Clearing the input lets the user pick the same file again after
      // fixing it, and keeps a refused file out of the next submit.
      event.target.value = ''
    }

    setSelectedFile(rejection ? null : file)
    setFileRejection(rejection)
  }

  async function handleValid(data: MaterialReceiptFormData) {
    // A refused file blocks the submit; it was never kept as the selection.
    if (fileRejection) return

    // POST /material-receipts is not idempotent (§12): the ref drops a second
    // submit that arrives before the button is disabled, and stays set after
    // a save, until the screen leaves.
    if (isSendingRef.current) return
    isSendingRef.current = true

    let saved = false
    try {
      // A blank field stays undefined, which leaves the part out of the body:
      // "no form" on create, "keep the current one" on edit (R-18).
      saved = await onSubmit(data, selectedFile ?? undefined)
    } finally {
      isSendingRef.current = saved
    }
    if (saved) setIsSaved(true)
  }

  return (
    <form className="space-y-6 pb-32" onSubmit={handleSubmit(handleValid)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={listHref} className="hover:text-primary">
              {tp('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{typeLabel}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {isCreate ? t('newReceiptTitle') : (code ?? t('editReceiptTitle'))}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate
              ? t('newReceiptDescription')
              : t('editReceiptDescription')}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field
              label={tp('columns.employee')}
              htmlFor="employee"
              error={errors.employee?.message}
              help={textHint}
            >
              <Input
                id="employee"
                placeholder={t('employeePlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('employee')}
              />
            </Field>

            <Field
              label={tp('columns.employeeRegistry')}
              htmlFor="employee_registry"
              error={errors.employee_registry?.message}
              help={textHint}
            >
              <Input
                id="employee_registry"
                placeholder={t('employeeRegistryPlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('employee_registry')}
              />
            </Field>

            <Field
              label={tp('columns.date')}
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

          <ProjectFileField
            inputId="file"
            label={fileLabel}
            policy={MATERIAL_RECEIPT_FILE_POLICY}
            icon="description"
            hint={t('receiptFileHint', {
              extensions: formatProjectFileExtensions(
                MATERIAL_RECEIPT_FILE_POLICY
              ),
              max: MATERIAL_RECEIPT_FILE_POLICY.maxMegabytes,
            })}
            currentFile={currentFile}
            selectedFile={selectedFile}
            error={fileError}
            keepHint={t('receiptFileKeepHint')}
            removeLabel={t('removeReceiptFile')}
            disabled={isSubmitting}
            isDownloading={isDownloadingFile}
            onFileChange={handleFileChange}
            onDownload={onDownloadFile}
            onRemove={onRemoveFile && currentFile ? onRemoveFile : undefined}
          />
        </div>
      </Card>

      <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-var(--shell-sidebar-width,16rem))]">
        <div className="mx-auto flex max-w-6xl justify-end gap-3">
          <Link
            href={listHref}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          {/* Disabled while pending: POST /material-receipts is not
              idempotent, so a double click would create two records (§12). */}
          <Button
            type="submit"
            disabled={isSubmitting || isSaved}
            className="rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
          >
            {isSubmitting || isSaved
              ? isCreate
                ? t('creating')
                : tc('saving')
              : isCreate
                ? t('createReceipt')
                : t('update')}
          </Button>
        </div>
      </div>
    </form>
  )
}
