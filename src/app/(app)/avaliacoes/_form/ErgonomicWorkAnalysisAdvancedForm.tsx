'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components/ui'

import {
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA,
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS,
  MAX_EVALUATION_ROWS,
} from '../components/ergonomic-work-analysis-advanced-fields'
import type { EvaluationFormProps } from '../definitions/types'
import {
  EvaluationPhotoField,
  type EvaluationPhotoSelection,
  NO_PHOTO_SELECTION,
} from './EvaluationPhotoField'
import {
  type EvaluationRowsColumn,
  EvaluationRowsField,
} from './EvaluationRowsField'
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
  type ErgonomicWorkAnalysisAdvancedFormData,
  type ErgonomicWorkAnalysisAdvancedFormInput,
  ergonomicWorkAnalysisAdvancedFormDefaultValues,
  makeErgonomicWorkAnalysisAdvancedSchema,
  type Translate,
} from './schema'

/** The id of the photo picker, also its label's `htmlFor`. */
const PHOTO_FIELD_ID = 'sector_photo'

/**
 * Create, edit and view form of an Análise Ergonômica do Trabalho – Produção
 * (J1 to J3, FR-025), in one react-hook-form instance with no watch, in the
 * order of the legacy report: the identification (activity and date, both
 * required), the sector photo beside the task description, the two tables of
 * rows, the 7 complementary data and the results and recommendations. Every
 * text and cell is optional.
 *
 * The photo is kept out of react-hook-form (D-7): a refused one blocks the
 * submit before any request (R-7), and the one picked survives an invalid
 * submit or an error of the API, like the texts and the rows (R-18). It goes
 * to the page with the data, which sends it after the `POST` or the `PUT`
 * (FR-020). The deletion is not here: it lives on the listing.
 */
export function ErgonomicWorkAnalysisAdvancedForm({
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
}: EvaluationFormProps<ErgonomicWorkAnalysisAdvancedFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const [photo, setPhoto] =
    useState<EvaluationPhotoSelection>(NO_PHOTO_SELECTION)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeErgonomicWorkAnalysisAdvancedSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<
    ErgonomicWorkAnalysisAdvancedFormInput,
    unknown,
    ErgonomicWorkAnalysisAdvancedFormData
  >({
    resolver: zodResolver(schema),
    defaultValues:
      initialValues ?? ergonomicWorkAnalysisAdvancedFormDefaultValues(),
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

  const isCreate = !code
  const typeLabel = t('types.ergonomic_work_analysis_advanced')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<ErgonomicWorkAnalysisAdvancedFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit: onSubmit
        ? (data) => onSubmit(data, photo.file ? { photo: photo.file } : {})
        : undefined,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  /**
   * A refused photo blocks the submit, with its message beside the picker,
   * before any request (R-7, AC-007); the fields are still validated, so
   * every error shows at once.
   */
  function handleValidData(data: ErgonomicWorkAnalysisAdvancedFormData) {
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

  const stepColumns: EvaluationRowsColumn[] =
    ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS.steps.map((column) => ({
      key: column,
      label: t(
        `ergonomicWorkAnalysisAdvancedFields.tables.steps.columns.${column}`
      ),
    }))
  const analyzedActivityColumns: EvaluationRowsColumn[] =
    ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS.analyzedActivities.map(
      (column) => ({
        key: column,
        label: t(
          `ergonomicWorkAnalysisAdvancedFields.tables.analyzedActivities.columns.${column}`
        ),
      })
    )

  const answerField = (
    key:
      | 'description'
      | 'resultsAndConclusions'
      | 'recomendations'
      | (typeof ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA)[number]
  ) => (
    <TextField
      key={key}
      id={answerId(key)}
      label={t(`ergonomicWorkAnalysisAdvancedFields.answers.${key}`)}
      registration={register(`answers.${key}`)}
      error={errors.answers?.[key]?.message}
      multiline
    />
  )

  const photoLabel = t('ergonomicWorkAnalysisAdvancedForm.fields.photo')

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newErgonomicWorkAnalysisAdvanced')}
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
      <Section
        title={t('ergonomicWorkAnalysisAdvancedForm.sections.identification')}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <Field
            label={t('ergonomicWorkAnalysisAdvancedForm.fields.date')}
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

      <Section
        title={t('ergonomicWorkAnalysisAdvancedForm.sections.sectorAndTask')}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
          {answerField('description')}
        </div>
      </Section>

      <Section
        title={t('ergonomicWorkAnalysisAdvancedFields.tables.steps.title')}
      >
        <EvaluationRowsField
          control={control}
          register={register}
          name="answers.steps"
          title={t('ergonomicWorkAnalysisAdvancedFields.tables.steps.title')}
          columns={stepColumns}
          readOnly={readOnly}
          maxRows={MAX_EVALUATION_ROWS}
        />
      </Section>

      <Section
        title={t(
          'ergonomicWorkAnalysisAdvancedFields.tables.analyzedActivities.title'
        )}
      >
        <EvaluationRowsField
          control={control}
          register={register}
          name="answers.analyzedActivities"
          title={t(
            'ergonomicWorkAnalysisAdvancedFields.tables.analyzedActivities.title'
          )}
          columns={analyzedActivityColumns}
          readOnly={readOnly}
          maxRows={MAX_EVALUATION_ROWS}
        />
      </Section>

      <Section
        title={t(
          'ergonomicWorkAnalysisAdvancedForm.sections.complementaryData'
        )}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA.map(answerField)}
        </div>
      </Section>

      <Section title={t('ergonomicWorkAnalysisAdvancedForm.sections.results')}>
        {answerField('resultsAndConclusions')}
        {answerField('recomendations')}
      </Section>
    </EvaluationFormLayout>
  )
}
