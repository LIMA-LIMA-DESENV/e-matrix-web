'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components/ui'
import { CHANGE_ASSESSMENT_QUESTIONS } from '../components/change-assessment-questions'
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
  type ChangeAssessmentFormData,
  type ChangeAssessmentFormInput,
  changeAssessmentFormDefaultValues,
  makeChangeAssessmentSchema,
  type Translate,
} from './schema'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

export interface ChangeAssessmentFormProps {
  /** The record's code, the title of the edit and the view; absent to create. */
  code?: string
  initialValues?: ChangeAssessmentFormData
  /** The view (J2): every control disabled, for real, and no "Salvar". */
  readOnly?: boolean
  activities: EvaluationActivityOptionsState
  /** The tab, with the search, sort and page the user came from. */
  listHref: string
  /** Buttons of the header, beside "Voltar" (the view's PDF and "Alterar"). */
  headerActions?: ReactNode
  isSubmitting?: boolean
  errorMessage?: string | null
  /**
   * Sends the form. Resolves `true` once saved, when the screen is about to
   * leave: the form then stays locked, so nothing is sent again meanwhile.
   */
  onSubmit?: (data: ChangeAssessmentFormData) => Promise<boolean>
}

/**
 * Create, edit and view form of an Avaliação de Mudanças / Projetos (J1 to
 * J3, FR-015), in one react-hook-form instance with no watch, so typing in
 * one of the 8 text areas renders only that field: the identification
 * (activity and date, both required) and the 8 questions, each labelled with
 * its numbered text, the same as the PDF's (FR-018), over an optional
 * multiline answer. The deletion is not here: it lives on the listing.
 */
export function ChangeAssessmentForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: ChangeAssessmentFormProps) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeChangeAssessmentSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ChangeAssessmentFormInput, unknown, ChangeAssessmentFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? changeAssessmentFormDefaultValues(),
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
  const typeLabel = t('types.change_assessment')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } = useGuardedSubmit<ChangeAssessmentFormData>({
    readOnly,
    isReady: isActivitiesReady,
    onSubmit,
  })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('form.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newChangeAssessment')}
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
      <Section title={t('changeAssessmentForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <Field
            label={t('changeAssessmentForm.fields.assessmentDate')}
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
        </div>
      </Section>

      <Section
        title={t('changeAssessmentForm.sections.questions')}
        description={
          readOnly ? undefined : t('changeAssessmentForm.questionsDescription')
        }
      >
        {CHANGE_ASSESSMENT_QUESTIONS.map((key, index) => (
          <TextField
            key={key}
            id={answerId(key)}
            // Numbered "N )" like the legacy report and the PDF.
            label={`${index + 1} ) ${t(`pdf.changeAssessment.questions.${key}`)}`}
            registration={register(`answers.${key}`)}
            error={errors.answers?.[key]?.message}
            multiline
          />
        ))}
      </Section>
    </EvaluationFormLayout>
  )
}
