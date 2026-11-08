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

import { Button, Card, Input, inputVariants, Label } from '@/components/ui'
import type {
  ImprovementProjectActivity,
  ImprovementProjectScope,
  Period,
  ProjectFile,
} from '@/http/api'
import {
  IMPROVEMENT_PROJECT_PHOTO_FIELDS,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'
import { checkFile, type FileRejection, PHOTO_POLICY } from '@/lib/file-policy'

import {
  formatProjectActivity,
  IMPROVEMENT_PROJECT_PHOTOS,
  SCOPE_TYPES,
} from '../components'
import { ProjectFileField } from './ProjectFileField'
import {
  type ImprovementProjectFormData,
  improvementProjectFormDefaultValues,
  MAX_PROJECT_TEXT_LENGTH,
  makeImprovementProjectSchema,
  type Translate,
} from './schema'

const inputClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

const textareaClasses =
  'h-auto resize-y rounded-xl border-none bg-surface-container-high px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20'

/**
 * The photos picked in the form, by multipart part (D-8). A photo left blank
 * is absent, which keeps the stored one on edit and means "none" on create;
 * it is never an empty `File`.
 */
export type ImprovementProjectFormFiles = {
  before_photo?: File
  after_photo?: File
}

type PerPhoto<T> = Record<ImprovementProjectPhotoKey, T>

const NO_PHOTOS: PerPhoto<null> = { 'before-photo': null, 'after-photo': null }

/** The activities of the select, from `GET /improvement-projects/activities`. */
export interface ActivityOptionsState {
  options: readonly ImprovementProjectActivity[]
  isLoading: boolean
  /** A failed load blocks the submit: there is nothing valid to choose (§12). */
  isError: boolean
  onRetry: () => void
}

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
  help?: ReactNode
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
        help && <div className="text-xs text-on-surface-variant">{help}</div>
      )}
    </div>
  )
}

interface ImprovementProjectFormProps {
  mode: 'create' | 'edit'
  /** The type of the route: RGP (`production`) or RGA (`office`). */
  scope: ImprovementProjectScope
  /** Edit only: the record's code, the title of the screen (J10). */
  code?: string
  initialValues?: ImprovementProjectFormData
  /** Edit only: the two photos already stored. */
  currentPhotos?: PerPhoto<ProjectFile | null>
  /**
   * The registered periods, already loaded: a date outside all of them is
   * refused here, without a request (FR-035).
   */
  periods: readonly Period[]
  activities: ActivityOptionsState
  /** The tab, with the filters the user came from. */
  listHref: string
  isSubmitting: boolean
  errorMessage?: string | null
  /**
   * Sends the form. Resolves `true` once saved, when the screen is about to
   * leave: the form then stays locked, so nothing is sent again meanwhile.
   */
  onSubmit: (
    data: ImprovementProjectFormData,
    files: ImprovementProjectFormFiles
  ) => Promise<boolean>
  /** Edit only: opens the removal confirmation of one photo. */
  onRemovePhoto?: (photo: ImprovementProjectPhotoKey) => void
  /** Edit only: downloads one stored photo. */
  onDownloadPhoto?: (photo: ImprovementProjectPhotoKey) => void
  /** Photo being downloaded, if any. */
  downloadingPhoto?: ImprovementProjectPhotoKey | null
}

/**
 * Create and edit form of a project register (J8, J10, FR-035), shared by RGP
 * and RGA, which have exactly the same fields; the scope comes from the route
 * and never changes. The activity is a native select of `código — nome`
 * (H-6). Each photo is validated on its own and refused next to itself,
 * before any request. The deletion is not here: it lives on the listing
 * (D-15).
 */
export function ImprovementProjectForm({
  mode,
  scope,
  code,
  initialValues,
  currentPhotos = NO_PHOTOS,
  periods,
  activities,
  listHref,
  isSubmitting,
  errorMessage,
  onSubmit,
  onRemovePhoto,
  onDownloadPhoto,
  downloadingPhoto = null,
}: ImprovementProjectFormProps) {
  const t = useTranslations('projects.form')
  const tv = useTranslations('projects.validation')
  const tp = useTranslations('projects')
  const tc = useTranslations('common')
  const [selectedPhotos, setSelectedPhotos] =
    useState<PerPhoto<File | null>>(NO_PHOTOS)
  const [photoRejections, setPhotoRejections] =
    useState<PerPhoto<FileRejection | null>>(NO_PHOTOS)
  const isSendingRef = useRef(false)
  const [isSaved, setIsSaved] = useState(false)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeImprovementProjectSchema(tv as unknown as Translate, periods),
    [tv, periods]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ImprovementProjectFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? improvementProjectFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  // A native select can only show a value it has an option for: when the
  // options arrive after the value (edit, or a retried load), the value is
  // applied again so the select shows the record's activity.
  const { options: activityOptions } = activities
  useEffect(() => {
    if (activityOptions.length === 0) return
    setValue('activity_id', getValues('activity_id'))
  }, [activityOptions, getValues, setValue])

  const isCreate = mode === 'create'
  const typeLabel = tp(`types.${SCOPE_TYPES[scope]}`)
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const textHint = tv('textHint', { max: MAX_PROJECT_TEXT_LENGTH })

  function photoError(photo: ImprovementProjectPhotoKey) {
    const rejection = photoRejections[photo]
    if (!rejection) return null

    return rejection === 'too-large'
      ? tv('photoTooLarge', { max: PHOTO_POLICY.maxMegabytes })
      : tv('photoTypeNotAllowed')
  }

  /**
   * Refuses a photo before any request (AC-026), next to its own field, and
   * clears that native input, so a refused file can never be attached by a
   * later submit. The other photo is left as it was.
   */
  function handlePhotoChange(
    photo: ImprovementProjectPhotoKey,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null
    const rejection = file ? checkFile(file, PHOTO_POLICY) : null

    if (rejection) {
      // Clearing the input lets the user pick the same file again after
      // fixing it, and keeps a refused file out of the next submit.
      event.target.value = ''
    }

    setSelectedPhotos((current) => ({
      ...current,
      [photo]: rejection ? null : file,
    }))
    setPhotoRejections((current) => ({ ...current, [photo]: rejection }))
  }

  async function handleValid(data: ImprovementProjectFormData) {
    if (!isActivitiesReady) return
    // A refused photo blocks the submit; it was never kept as the selection.
    if (photoRejections['before-photo'] || photoRejections['after-photo']) {
      return
    }

    // POST /improvement-projects is not idempotent (§12). The button is
    // disabled only after React re-renders, and validation is async, so a
    // fast double click would reach here twice: the ref drops the second one.
    // After a save it stays set, since the screen still refreshes the caches
    // before leaving and the mutation is no longer pending by then.
    if (isSendingRef.current) return
    isSendingRef.current = true

    // Only the picked photos become parts: an absent key leaves its part out
    // of the body, so a blank field is never sent as an empty file.
    const files: ImprovementProjectFormFiles = {}
    for (const { key } of IMPROVEMENT_PROJECT_PHOTOS) {
      const file = selectedPhotos[key]
      if (file) files[IMPROVEMENT_PROJECT_PHOTO_FIELDS[key]] = file
    }

    let saved = false
    try {
      saved = await onSubmit(data, files)
    } finally {
      isSendingRef.current = saved
    }
    if (saved) setIsSaved(true)
  }

  function activityHelp() {
    if (activities.isLoading) return t('activitiesLoading')

    if (activities.isError) {
      return (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-2 font-medium text-error"
        >
          {t('activitiesLoadError')}
          <button
            type="button"
            onClick={activities.onRetry}
            className="font-bold underline hover:no-underline"
          >
            {tc('retry')}
          </button>
        </p>
      )
    }

    return activities.options.length === 0
      ? t('activitiesEmpty')
      : t('activityHint')
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
            {isCreate ? t('newTitle') : (code ?? t('editTitle'))}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate
              ? t('newDescription', { type: typeLabel })
              : t('editDescription', { type: typeLabel })}
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
              label={tp('columns.activity')}
              htmlFor="activity_id"
              error={errors.activity_id?.message}
              help={activityHelp()}
            >
              <select
                id="activity_id"
                disabled={isSubmitting || !isActivitiesReady}
                className={inputVariants({
                  className: `${inputClasses} w-full cursor-pointer text-sm text-on-surface`,
                })}
                {...register('activity_id')}
              >
                <option value="">{t('activityPlaceholder')}</option>
                {activities.options.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {formatProjectActivity(activity)}
                  </option>
                ))}
              </select>
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

            <Field
              label={tp('columns.concern')}
              htmlFor="concern"
              error={errors.concern?.message}
              help={textHint}
              className="space-y-2 md:col-span-2"
            >
              <textarea
                id="concern"
                rows={3}
                placeholder={t('concernPlaceholder')}
                disabled={isSubmitting}
                className={inputVariants({ className: textareaClasses })}
                {...register('concern')}
              />
            </Field>

            <Field
              label={tp('columns.recommendation')}
              htmlFor="improvement_recommendation"
              error={errors.improvement_recommendation?.message}
              help={textHint}
              className="space-y-2 md:col-span-2"
            >
              <textarea
                id="improvement_recommendation"
                rows={3}
                placeholder={t('recommendationPlaceholder')}
                disabled={isSubmitting}
                className={inputVariants({ className: textareaClasses })}
                {...register('improvement_recommendation')}
              />
            </Field>

            {/* Free text, as in the legacy system: no fixed list. */}
            <Field
              label={t('priority')}
              htmlFor="priority"
              error={errors.priority?.message}
              help={textHint}
              className="space-y-2 md:col-span-2"
            >
              <Input
                id="priority"
                placeholder={t('priorityPlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('priority')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {IMPROVEMENT_PROJECT_PHOTOS.map(({ key, label }) => {
              const currentFile = currentPhotos[key]

              return (
                <ProjectFileField
                  key={key}
                  inputId={IMPROVEMENT_PROJECT_PHOTO_FIELDS[key]}
                  label={tp(label)}
                  policy={PHOTO_POLICY}
                  currentFile={currentFile}
                  selectedFile={selectedPhotos[key]}
                  error={photoError(key)}
                  keepHint={t(`photoKeepHint.${key}`)}
                  removeLabel={t(`removePhoto.${key}`)}
                  disabled={isSubmitting}
                  isDownloading={downloadingPhoto === key}
                  onFileChange={(event) => handlePhotoChange(key, event)}
                  onDownload={
                    onDownloadPhoto ? () => onDownloadPhoto(key) : undefined
                  }
                  onRemove={
                    onRemovePhoto && currentFile
                      ? () => onRemovePhoto(key)
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
          <Link
            href={listHref}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          {/* Disabled while pending: POST /improvement-projects is not
              idempotent, so a double click would create two records (§12). */}
          <Button
            type="submit"
            disabled={isSubmitting || isSaved || !isActivitiesReady}
            className="rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
          >
            {isSubmitting || isSaved
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
