'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { type Control, useForm, useWatch } from 'react-hook-form'

import { Input } from '@/components/ui'
import {
  computePriorityCriterionScore,
  PRIORITY_CRITERION_BANDS,
  PRIORITY_CRITERION_CATEGORIES,
  PRIORITY_CRITERION_QUESTIONS,
  type PriorityCriterionQuestionField,
} from '../components/priority-criterion-questions'
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
  makePriorityCriterionSchema,
  type PriorityCriterionFormData,
  priorityCriterionFormDefaultValues,
  type Translate,
} from './schema'

type PriorityCriterionControl = Control<
  PriorityCriterionFormData,
  unknown,
  PriorityCriterionFormData
>

const QUESTION_FIELDS: PriorityCriterionQuestionField[] =
  PRIORITY_CRITERION_QUESTIONS.map(({ field }) => field)

/**
 * The sum and the priority of the answers as they are now (FR-019, R-12).
 * Only the 5 questions are watched, never the whole form, as the live score
 * of the CDIA: typing the sector or a solution computes nothing. A radio
 * holds the points as a string; `''` (no choice yet) is no answer.
 */
function useLivePriorityCriterionScore(control: PriorityCriterionControl) {
  const values = useWatch({ control, name: QUESTION_FIELDS })

  return useMemo(
    () =>
      computePriorityCriterionScore(
        Object.fromEntries(
          QUESTION_FIELDS.map((field, index) => {
            const value = values[index]
            return [field, value === '' ? null : Number(value)]
          })
        )
      ),
    [values]
  )
}

/**
 * The sum and the priority below the questions, in a polite live region
 * (NFR-008): each answer announces the new values without interrupting.
 * Complete, it shows the sum and the band, its priority and action in text
 * over the legacy color, never the color alone; incomplete, the partial sum
 * and how many answers are missing, without any band (R-12).
 */
function PriorityCriterionScore({
  control,
}: {
  control: PriorityCriterionControl
}) {
  const t = useTranslations('evaluations')
  const { sum, level, missing } = useLivePriorityCriterionScore(control)
  const band = PRIORITY_CRITERION_BANDS.find((item) => item.level === level)

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col gap-3 rounded-xl bg-surface-container-high px-5 py-4 text-base font-semibold text-on-surface-variant sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8"
    >
      <p>
        {band
          ? t('priorityCriterionForm.sum')
          : t('priorityCriterionForm.partialSum')}
        :{' '}
        <span className="font-bold text-ematrix-dark tabular-nums">{sum}</span>
      </p>
      {band ? (
        <p className="flex flex-wrap items-center gap-2">
          {t('priorityCriterionForm.priority')}:{' '}
          <span
            className="rounded-md px-3 py-1 font-bold"
            style={{ backgroundColor: band.color, color: band.textColor }}
          >
            {t(`priorityCriterionQuestions.levels.${band.level}.priority`)} —{' '}
            {t(`priorityCriterionQuestions.levels.${band.level}.action`)}
          </span>
        </p>
      ) : (
        <p className="text-sm font-medium">
          {t('priorityCriterionForm.missing', { count: missing })}
        </p>
      )}
    </div>
  )
}

/**
 * Create, edit and view form of a Critério de Prioridade (J1 to J3, FR-019),
 * in one react-hook-form instance and three sections (H-8): the
 * identification (date, activity, sector, number of employees and valuer,
 * all required, and, in the view only, the current area and fabric of the
 * activity, R-6), the assessment of the ergonomic risk (the 5 required
 * questions, each a radio group of its scored options, and the live sum and
 * priority), and the categories of priorities (the 5 optional solutions). A
 * failed send keeps every field and answer. The deletion is not here: it
 * lives on the listing.
 */
export function PriorityCriterionForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: EvaluationFormProps<PriorityCriterionFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makePriorityCriterionSchema(tv as unknown as Translate),
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
  } = useForm<PriorityCriterionFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? priorityCriterionFormDefaultValues(),
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
  const typeLabel = t('types.priority_criterion')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } = useGuardedSubmit<PriorityCriterionFormData>({
    readOnly,
    isReady: isActivitiesReady,
    onSubmit,
  })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('priorityCriterionForm.newDescription', { type: typeLabel })
      : t('priorityCriterionForm.editDescription', { type: typeLabel })
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newPriorityCriterion')}
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
      <Section title={t('priorityCriterionForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label={t('pdf.priorityCriterion.fields.date')}
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
            label={t('pdf.priorityCriterion.fields.sector')}
            registration={register('sector')}
            error={errors.sector?.message}
          />

          <Field
            label={t('pdf.priorityCriterion.fields.numberOfEmployees')}
            htmlFor="number_of_employees"
            error={errors.number_of_employees?.message}
            help={
              readOnly
                ? undefined
                : t('priorityCriterionForm.numberOfEmployeesHint')
            }
          >
            <Input
              id="number_of_employees"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.number_of_employees ? true : undefined}
              className={inputClasses}
              {...register('number_of_employees')}
            />
          </Field>

          <TextField
            id="responsible"
            label={t('pdf.priorityCriterion.valuer')}
            registration={register('responsible')}
            error={errors.responsible?.message}
          />

          {/* The current area and fabric of the activity, only to read: the
              view shows them; they are never sent. */}
          {readOnly && (
            <>
              <TextField
                id="location_area"
                label={t('pdf.priorityCriterion.fields.area')}
                registration={register('location.area')}
              />
              <TextField
                id="location_fabric"
                label={t('pdf.priorityCriterion.fields.fabric')}
                registration={register('location.fabric')}
              />
            </>
          )}
        </div>
      </Section>

      <Section
        title={t('priorityCriterionForm.sections.risk')}
        description={
          readOnly ? undefined : t('priorityCriterionForm.riskDescription')
        }
      >
        <div className="space-y-6">
          {PRIORITY_CRITERION_QUESTIONS.map((question, index) => (
            <ChoiceAnswer
              key={question.field}
              id={answerId(question.field)}
              legend={`${index + 1}. ${t(
                `priorityCriterionQuestions.questions.${question.field}`
              )}`}
              registration={register(question.field)}
              options={question.options.map((option) => ({
                points: option.points,
                label: t(`priorityCriterionQuestions.options.${option.key}`),
              }))}
              error={errors[question.field]?.message}
            />
          ))}
        </div>
        <PriorityCriterionScore control={control} />
      </Section>

      <Section
        title={t('priorityCriterionQuestions.categoriesTitle')}
        description={
          readOnly
            ? undefined
            : t('priorityCriterionForm.categoriesDescription')
        }
      >
        {PRIORITY_CRITERION_CATEGORIES.map((category) => (
          <TextField
            key={category.answer}
            id={answerId(category.answer)}
            label={`${category.number} - ${t(
              `priorityCriterionQuestions.categories.${category.answer}`
            )}`}
            multiline
            registration={register(`answers.${category.answer}`)}
            error={errors.answers?.[category.answer]?.message}
          />
        ))}
      </Section>
    </EvaluationFormLayout>
  )
}
