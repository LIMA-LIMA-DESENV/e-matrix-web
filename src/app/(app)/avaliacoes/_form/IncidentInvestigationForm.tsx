'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Input, inputVariants } from '@/components/ui'

import { INCIDENT_INVESTIGATION_RISK_FACTORS } from '../components/incident-investigation-fields'
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
  textareaClasses,
  useGuardedSubmit,
} from './form-parts'
import {
  type IncidentInvestigationFormData,
  incidentInvestigationFormDefaultValues,
  makeIncidentInvestigationSchema,
  type Translate,
} from './schema'

/** The id of the photo picker, also its label's `htmlFor`. */
const PHOTO_FIELD_ID = 'incident_investigation_photo'

/** The list of the 6 factors, which describes the text area beside it. */
const RISK_FACTORS_LIST_ID = 'incident_investigation_risk_factors'

/**
 * Create, edit and view form of an Avaliação de Incidente / Acidente (J1 to J3,
 * FR-015), in one react-hook-form instance with no watch, in the four sections
 * of H-7: the identification (date and activity, required; sector and employee,
 * optional, each in one line), the occurrence (required), the ergonomic risk
 * factors and the comments with the image.
 *
 * The 6 factors are plain text, not controls (D-5): a list beside the single
 * text area, above it on a narrow screen, describing it (`aria-describedby`,
 * NFR-008).
 *
 * The sector and the employee have no `maxLength`, unlike the AETA's sector:
 * the browser would cut the typing at the limit, and the API answers one message
 * for every refused answer (D-3), so the schema is what names the field (AC-005).
 *
 * The photo is kept out of react-hook-form, as in the AETA: a refused one blocks
 * the submit before any request, and the one picked survives an invalid submit
 * or an error of the API. The deletion lives on the listing.
 */
export function IncidentInvestigationForm({
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
}: EvaluationFormProps<IncidentInvestigationFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const [photo, setPhoto] =
    useState<EvaluationPhotoSelection>(NO_PHOTO_SELECTION)

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeIncidentInvestigationSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<IncidentInvestigationFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? incidentInvestigationFormDefaultValues(),
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
  const typeLabel = t('types.incident_investigation')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<IncidentInvestigationFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit: onSubmit
        ? (data) => onSubmit(data, photo.file ? { photo: photo.file } : {})
        : undefined,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  /**
   * A refused photo blocks the submit, with its message beside the picker,
   * before any request (AC-010); the fields are still validated, so every
   * error shows at once.
   */
  function handleValidData(data: IncidentInvestigationFormData) {
    if (photo.rejection) {
      document.getElementById(PHOTO_FIELD_ID)?.focus()
      return
    }
    return handleValid(data)
  }

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('incidentInvestigationForm.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  const riskFactorsId = answerId('ergonomicRiskFactors')
  const riskFactorsError = errors.answers?.ergonomicRiskFactors?.message

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newIncidentInvestigation')}
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
      <Section title={t('incidentInvestigationForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label={t('incidentInvestigationForm.fields.date')}
            htmlFor="investigation_date"
            error={errors.investigation_date?.message}
          >
            {/* Calendar day: sent as typed, never through Date. */}
            <Input
              id="investigation_date"
              type="date"
              aria-invalid={errors.investigation_date ? true : undefined}
              className={inputClasses}
              {...register('investigation_date')}
            />
          </Field>

          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <TextField
            id={answerId('sector')}
            label={t('incidentInvestigationForm.fields.sector')}
            registration={register('answers.sector')}
            error={errors.answers?.sector?.message}
          />

          <TextField
            id={answerId('employee')}
            label={t('incidentInvestigationForm.fields.employee')}
            registration={register('answers.employee')}
            error={errors.answers?.employee?.message}
          />
        </div>
      </Section>

      <Section title={t('incidentInvestigationForm.sections.occurrence')}>
        <TextField
          id="description"
          label={t('incidentInvestigationForm.fields.description')}
          registration={register('description')}
          error={errors.description?.message}
          multiline
        />
      </Section>

      <Section
        title={t('incidentInvestigationForm.sections.riskFactors')}
        description={t('incidentInvestigationForm.riskFactorsDescription')}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <ul id={RISK_FACTORS_LIST_ID} className="space-y-2">
            {INCIDENT_INVESTIGATION_RISK_FACTORS.map((factor) => (
              <li
                key={factor}
                className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface"
              >
                {t(`incidentInvestigationFields.riskFactors.${factor}`)}
              </li>
            ))}
          </ul>

          <Field
            label={t('incidentInvestigationForm.fields.ergonomicRiskFactors')}
            htmlFor={riskFactorsId}
            error={riskFactorsError}
          >
            <textarea
              id={riskFactorsId}
              rows={9}
              aria-describedby={RISK_FACTORS_LIST_ID}
              aria-invalid={riskFactorsError ? true : undefined}
              className={inputVariants({ className: textareaClasses })}
              {...register('answers.ergonomicRiskFactors')}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('incidentInvestigationForm.sections.commentsAndImage')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TextField
            id={answerId('comments')}
            label={t('incidentInvestigationForm.fields.comments')}
            registration={register('answers.comments')}
            error={errors.answers?.comments?.message}
            multiline
          />

          <EvaluationPhotoField
            id={PHOTO_FIELD_ID}
            label={t('incidentInvestigationForm.fields.image')}
            currentPhoto={currentPhoto}
            selection={photo}
            onSelectionChange={setPhoto}
            readOnly={readOnly}
            isDownloading={isDownloadingPhoto}
            onDownload={onDownloadPhoto}
            onRemove={onRemovePhoto}
          />
        </div>
      </Section>
    </EvaluationFormLayout>
  )
}
