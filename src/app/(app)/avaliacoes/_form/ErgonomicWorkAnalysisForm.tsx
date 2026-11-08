'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components/ui'

import {
  ERGONOMIC_WORK_ANALYSIS_MEASURES,
  ERGONOMIC_WORK_ANALYSIS_SECTOR_MAX_LENGTH,
  ERGONOMIC_WORK_ANALYSIS_TABLES,
  type ErgonomicWorkAnalysisMeasure,
  type ErgonomicWorkAnalysisMeasureRule,
  type ErgonomicWorkAnalysisTextAnswer,
} from '../components/ergonomic-work-analysis-fields'
import type { EvaluationFormProps } from '../definitions/types'
import {
  EvaluationPhotoField,
  type EvaluationPhotoSelection,
  NO_PHOTO_SELECTION,
} from './EvaluationPhotoField'
import {
  ActivityField,
  answerId,
  EvaluationFormLayout,
  Field,
  inputClasses,
  Section,
  TextField,
  useGuardedSubmit,
} from './form-parts'
import {
  type ErgonomicWorkAnalysisFormData,
  type ErgonomicWorkAnalysisFormInput,
  ergonomicWorkAnalysisFormDefaultValues,
  makeErgonomicWorkAnalysisSchema,
  type Translate,
  toErgonomicWorkAnalysisFormInput,
} from './schema'

/** The id of the photo picker, also its label's `htmlFor`. */
const PHOTO_FIELD_ID = 'workstation_photo'

/**
 * Create, edit and view form of an Análise Ergonômica do Trabalho –
 * Escritório (J1 to J3, FR-015), in one react-hook-form instance with no
 * watch, in the order of the legacy report: the workstation image, the
 * identification (activity and date, both required), the three texts of the
 * workstation, the "Tabela de Análise Ergonômica Avançada" (the sector, one
 * line of up to 255 characters, and two texts) and the 5 measures of the
 * physical environment. Every text and measure is optional.
 *
 * Each measure is typed in the user's number format, labelled with its unit
 * and described by its fixed reference (`aria-describedby`, NFR-009), which
 * is only shown: no value is highlighted for being out of it (R-13). A
 * measure refused by its rule shows its message in the field, before any
 * request (FR-016). On a narrow screen the measures wrap in rows.
 *
 * The photo is kept out of react-hook-form, as in the AETP: a refused one
 * blocks the submit before any request, and the one picked survives an
 * invalid submit or an error of the API. The deletion lives on the listing.
 */
export function ErgonomicWorkAnalysisForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  currentPhoto,
  onRemovePhoto,
  onDownloadPhoto,
  isDownloadingPhoto = false,
}: EvaluationFormProps<ErgonomicWorkAnalysisFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const locale = useLocale()
  const format = useFormatter()
  const [photo, setPhoto] =
    useState<EvaluationPhotoSelection>(NO_PHOTO_SELECTION)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeErgonomicWorkAnalysisSchema(tv as unknown as Translate, locale),
    [tv, locale]
  )

  // The measures in the user's number format, as they were saved (AC-009).
  const toControlValues = useCallback(
    (values: ErgonomicWorkAnalysisFormData) =>
      toErgonomicWorkAnalysisFormInput(values, (value) =>
        format.number(value, { maximumFractionDigits: 20 })
      ),
    [format]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<
    ErgonomicWorkAnalysisFormInput,
    unknown,
    ErgonomicWorkAnalysisFormData
  >({
    resolver: zodResolver(schema),
    defaultValues: toControlValues(
      initialValues ?? ergonomicWorkAnalysisFormDefaultValues()
    ),
  })

  useEffect(() => {
    if (initialValues) reset(toControlValues(initialValues))
  }, [initialValues, reset, toControlValues])

  // A native select can only show a value it has an option for: when the
  // options arrive after the value (edit, or a retried load), the value is
  // applied again so the select shows the record's activity.
  const { options: activityOptions } = activities
  useEffect(() => {
    if (activityOptions.length === 0) return
    setValue('activity_id', getValues('activity_id'))
  }, [activityOptions, getValues, setValue])

  const isCreate = !code
  const typeLabel = t('types.ergonomic_work_analysis')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<ErgonomicWorkAnalysisFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit: onSubmit
        ? (data) => onSubmit(data, photo.file ? { photo: photo.file } : {})
        : undefined,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  /**
   * A refused photo blocks the submit, with its message beside the picker,
   * before any request (AC-012); the fields are still validated, so every
   * error shows at once.
   */
  function handleValidData(data: ErgonomicWorkAnalysisFormData) {
    if (photo.rejection) {
      document.getElementById(PHOTO_FIELD_ID)?.focus()
      return
    }
    return handleValid(data)
  }

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('form.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  const textField = (key: ErgonomicWorkAnalysisTextAnswer) => (
    <TextField
      key={key}
      id={answerId(key)}
      label={t(`ergonomicWorkAnalysisFields.answers.${key}`)}
      registration={register(`answers.${key}`)}
      error={errors.answers?.[key]?.message}
      multiline
    />
  )

  function measureField(key: ErgonomicWorkAnalysisMeasure) {
    const { unitKey, referenceKey } = ERGONOMIC_WORK_ANALYSIS_MEASURES[key]
    const rule: ErgonomicWorkAnalysisMeasureRule =
      ERGONOMIC_WORK_ANALYSIS_MEASURES[key].rule
    const id = answerId(key)
    const referenceId = `${id}-reference`
    const error = errors.measures?.[key]?.message

    return (
      <Field
        key={key}
        label={`${t(`ergonomicWorkAnalysisFields.answers.${key}`)} (${t(`ergonomicWorkAnalysisFields.${unitKey}`)})`}
        htmlFor={id}
        error={error}
      >
        <Input
          id={id}
          inputMode={rule.integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          aria-describedby={referenceId}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          {...register(`measures.${key}`)}
        />
        <p id={referenceId} className="ml-1 text-xs text-on-surface-variant">
          {t('ergonomicWorkAnalysisForm.reference', {
            value: t(`ergonomicWorkAnalysisFields.${referenceKey}`),
          })}
        </p>
      </Field>
    )
  }

  const photoLabel = t('ergonomicWorkAnalysisForm.fields.photo')
  const sectorId = answerId('sector')

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newErgonomicWorkAnalysis')}
      description={description()}
      readOnly={readOnly}
      isLocked={isLocked}
      isCreate={isCreate}
      isBusy={isSubmitting || isSaved}
      submitDisabled={isSubmitting || isSaved || !isActivitiesReady}
      listHref={listHref}
      headerActions={headerActions}
      errorMessage={errorMessage}
      onSubmit={handleSubmit(handleValidData)}
    >
      <Section title={t('ergonomicWorkAnalysisForm.sections.photo')}>
        <EvaluationPhotoField
          id={PHOTO_FIELD_ID}
          label={photoLabel}
          currentPhoto={currentPhoto}
          selection={photo}
          onSelectionChange={setPhoto}
          readOnly={readOnly}
          isDownloading={isDownloadingPhoto}
          onDownload={onDownloadPhoto}
          onRemove={onRemovePhoto}
        />
      </Section>

      <Section title={t('ergonomicWorkAnalysisForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <Field
            label={t('ergonomicWorkAnalysisForm.fields.date')}
            htmlFor="date"
            error={errors.date?.message}
          >
            {/* Calendar day: sent as typed, never through Date. */}
            <Input
              id="date"
              type="date"
              aria-invalid={errors.date ? true : undefined}
              className={inputClasses}
              {...register('date')}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('ergonomicWorkAnalysisFields.tables.workstation')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ERGONOMIC_WORK_ANALYSIS_TABLES.workstation.map(textField)}
        </div>
      </Section>

      <Section title={t('ergonomicWorkAnalysisFields.tables.advancedAnalysis')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field
            label={t('ergonomicWorkAnalysisFields.answers.sector')}
            htmlFor={sectorId}
            error={errors.answers?.sector?.message}
          >
            {/* One line (H-4): an input drops the line breaks of a paste. */}
            <Input
              id={sectorId}
              maxLength={ERGONOMIC_WORK_ANALYSIS_SECTOR_MAX_LENGTH}
              aria-invalid={errors.answers?.sector ? true : undefined}
              className={inputClasses}
              {...register('answers.sector')}
            />
          </Field>
          {textField('globalClassificationWorkStation')}
          {textField('changeNeeded')}
        </div>
      </Section>

      <Section
        title={t('ergonomicWorkAnalysisFields.tables.physicalEnvironment')}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ERGONOMIC_WORK_ANALYSIS_TABLES.physicalEnvironment.map(measureField)}
        </div>
      </Section>
    </EvaluationFormLayout>
  )
}
