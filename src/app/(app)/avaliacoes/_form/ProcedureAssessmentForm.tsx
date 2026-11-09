'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components/ui'
import {
  PROCEDURE_ASSESSMENT_OPTIONS,
  PROCEDURE_ASSESSMENT_QUESTIONS,
} from '../components/procedure-assessment-questions'
import type { EvaluationFormProps } from '../definitions/types'
import {
  ActivityField,
  answerId,
  ChoiceAnswer,
  EvaluationFormLayout,
  Field,
  inputClasses,
  Section,
  TextField,
  useGuardedSubmit,
} from './form-parts'
import {
  makeProcedureAssessmentSchema,
  type ProcedureAssessmentFormData,
  procedureAssessmentFormDefaultValues,
  type Translate,
} from './schema'

/**
 * Create, edit and view form of an Avaliação de Risco Ergonômico de Tarefas
 * (J1 to J3, FR-016), in one react-hook-form instance and two sections (H-4):
 * the identification (date, activity, sector, valuer and rated turn, all
 * required, and, in the view only, the current area and fabric of the
 * activity, R-6) and the questions, each a required Sim/Não radio group
 * without points and, below it, its optional comment. Nothing here watches an
 * answer, so a comment is never disabled, hidden, required or cleared because
 * of it (R-10). A failed send keeps every field and answer. The deletion is
 * not here: it lives on the listing.
 */
export function ProcedureAssessmentForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: EvaluationFormProps<ProcedureAssessmentFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeProcedureAssessmentSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ProcedureAssessmentFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? procedureAssessmentFormDefaultValues(),
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
  const typeLabel = t('types.procedure_assessment')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<ProcedureAssessmentFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('procedureAssessmentForm.newDescription', { type: typeLabel })
      : t('procedureAssessmentForm.editDescription', { type: typeLabel })
  }

  const options = PROCEDURE_ASSESSMENT_OPTIONS.map((option) => ({
    points: option.value,
    label: t(`procedureAssessmentQuestions.${option.labelKey}`),
  }))

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newProcedureAssessment')}
      description={description()}
      readOnly={readOnly}
      isLocked={isLocked}
      isCreate={isCreate}
      isBusy={isSubmitting || isSaved}
      submitDisabled={isSubmitting || isSaved || !isActivitiesReady}
      listHref={listHref}
      headerActions={headerActions}
      errorMessage={errorMessage}
      onSubmit={handleSubmit(handleValid)}
    >
      <Section title={t('procedureAssessmentForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label={t('pdf.procedureAssessment.fields.date')}
            htmlFor="assessment_date"
            error={errors.assessment_date?.message}
          >
            {/* Calendar day: sent as typed, never through Date. */}
            <Input
              id="assessment_date"
              type="date"
              aria-invalid={errors.assessment_date ? true : undefined}
              className={inputClasses}
              {...register('assessment_date')}
            />
          </Field>

          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <TextField
            id="sector"
            label={t('pdf.procedureAssessment.fields.sector')}
            registration={register('sector')}
            error={errors.sector?.message}
          />

          <TextField
            id="valuer"
            label={t('pdf.procedureAssessment.fields.valuer')}
            registration={register('valuer')}
            error={errors.valuer?.message}
          />

          <TextField
            id="rated_turn"
            label={t('pdf.procedureAssessment.fields.ratedTurn')}
            registration={register('rated_turn')}
            error={errors.rated_turn?.message}
          />

          {/* The current area and fabric of the activity, only to read: the
              view shows them; they are never sent. */}
          {readOnly && (
            <>
              <TextField
                id="location_area"
                label={t('pdf.procedureAssessment.fields.area')}
                registration={register('location.area')}
              />
              <TextField
                id="location_fabric"
                label={t('pdf.procedureAssessment.fields.fabric')}
                registration={register('location.fabric')}
              />
            </>
          )}
        </div>
      </Section>

      <Section
        title={t('procedureAssessmentForm.sections.questions')}
        description={
          readOnly
            ? undefined
            : t('procedureAssessmentForm.questionsDescription')
        }
      >
        <div className="space-y-8">
          {PROCEDURE_ASSESSMENT_QUESTIONS.map((question, index) => (
            <div key={question.field} className="space-y-4">
              <ChoiceAnswer
                id={answerId(question.field)}
                legend={`${index + 1}. ${t(
                  `procedureAssessmentQuestions.${question.questionKey}`
                )}`}
                registration={register(question.field)}
                options={options}
                error={errors[question.field]?.message}
                hidePoints
              />
              <TextField
                id={answerId(question.commentKey)}
                label={t(
                  `procedureAssessmentQuestions.${question.commentLabelKey}`
                )}
                multiline
                registration={register(`answers.${question.commentKey}`)}
                error={errors.answers?.[question.commentKey]?.message}
              />
            </div>
          ))}
        </div>
      </Section>
    </EvaluationFormLayout>
  )
}
