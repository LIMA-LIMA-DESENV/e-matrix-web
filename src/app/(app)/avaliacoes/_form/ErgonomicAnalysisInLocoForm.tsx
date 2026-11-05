'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Input, inputVariants } from '@/components/ui'
import {
  ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS,
  ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS,
  ERGONOMIC_ANALYSIS_IN_LOCO_TIMES_AND_CYCLES,
  type ErgonomicAnalysisInLocoQuestion,
} from '../components/ergonomic-analysis-in-loco-questions'
import type { EvaluationFormProps } from '../definitions/types'
import {
  ActivityField,
  answerId,
  EvaluationFormLayout,
  Field,
  Group,
  inputClasses,
  Section,
  TextField,
  textareaClasses,
  useGuardedSubmit,
} from './form-parts'
import {
  ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION,
  type ErgonomicAnalysisInLocoFormData,
  type ErgonomicAnalysisInLocoFormInput,
  ergonomicAnalysisInLocoFormDefaultValues,
  makeErgonomicAnalysisInLocoSchema,
  type Translate,
  toErgonomicAnalysisInLocoFormInput,
} from './schema'

const PROCESS_STEPS_QUESTION = 'descriptionProcessSteps'
const TIMES_AND_CYCLES: readonly ErgonomicAnalysisInLocoQuestion[] =
  ERGONOMIC_ANALYSIS_IN_LOCO_TIMES_AND_CYCLES

/** The questions as the form lays them out: one by one, or a titled group. */
const LAYOUT: readonly (ErgonomicAnalysisInLocoQuestion | 'timesAndCycles')[] =
  ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.flatMap((key) => {
    if (key === TIMES_AND_CYCLES[0]) return ['timesAndCycles' as const]
    return TIMES_AND_CYCLES.includes(key) ? [] : [key]
  })

/**
 * Create, edit and view form of a Coleta de Dados In Loco — Produção (J1 to
 * J3, FR-015), in one react-hook-form instance with no watch: the
 * identification (date, shift schedule, activity and sector, all required,
 * and, in the view only, the current area and fabric of the activity, R-6)
 * and the 20 questions of R-7, numbered with the texts of the PDF. Questions
 * 5 to 7 are grouped under "Tempos e ciclos", question 5 being a number typed
 * in the user's format; question 8 shows the 5 steps of its guide before its
 * text area. The deletion is not here: it lives on the listing.
 */
export function ErgonomicAnalysisInLocoForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: EvaluationFormProps<ErgonomicAnalysisInLocoFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const locale = useLocale()
  const format = useFormatter()

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeErgonomicAnalysisInLocoSchema(tv as unknown as Translate, locale),
    [tv, locale]
  )

  // Question 5 in the user's number format, as it was saved (RK-4).
  const toControlValues = useCallback(
    (values: ErgonomicAnalysisInLocoFormData) =>
      toErgonomicAnalysisInLocoFormInput(values, (value) =>
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
    ErgonomicAnalysisInLocoFormInput,
    unknown,
    ErgonomicAnalysisInLocoFormData
  >({
    resolver: zodResolver(schema),
    defaultValues: toControlValues(
      initialValues ?? ergonomicAnalysisInLocoFormDefaultValues()
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
  const typeLabel = t('types.ergonomic_analysis_in_loco')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<ErgonomicAnalysisInLocoFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('ergonomicAnalysisInLocoForm.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  function questionLabel(key: ErgonomicAnalysisInLocoQuestion) {
    const number = ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.indexOf(key) + 1
    // Numbered "N )" like the AMP; the text is the PDF's (FR-018).
    return `${number} ) ${t(`pdf.ergonomicAnalysisInLoco.questions.${key}`)}`
  }

  function renderQuestion(key: ErgonomicAnalysisInLocoQuestion) {
    const id = answerId(key)

    if (key === ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION) {
      return (
        <Field
          key={key}
          label={questionLabel(key)}
          htmlFor={id}
          error={errors.timesPerShift?.message}
          help={
            readOnly
              ? undefined
              : t('ergonomicAnalysisInLocoForm.timesPerShiftHint')
          }
        >
          <Input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errors.timesPerShift ? true : undefined}
            className={inputClasses}
            {...register('timesPerShift')}
          />
        </Field>
      )
    }

    if (key === PROCESS_STEPS_QUESTION) {
      const error = errors.texts?.[key]?.message
      const guideId = `${id}-guide`

      return (
        <Field key={key} label={questionLabel(key)} htmlFor={id} error={error}>
          <div
            id={guideId}
            className="rounded-xl border border-outline-variant/30 px-4 py-3 text-sm text-on-surface-variant"
          >
            <p className="mb-1 font-semibold">
              {t('ergonomicAnalysisInLocoForm.processStepsLabel')}
            </p>
            <ul className="space-y-1">
              {ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS.map((step) => (
                <li key={step} className="whitespace-pre-line">
                  {t(`pdf.ergonomicAnalysisInLoco.processSteps.${step}`)}
                </li>
              ))}
            </ul>
          </div>
          <textarea
            id={id}
            rows={4}
            aria-describedby={guideId}
            aria-invalid={error ? true : undefined}
            className={inputVariants({ className: textareaClasses })}
            {...register(`texts.${key}`)}
          />
        </Field>
      )
    }

    return (
      <TextField
        key={key}
        id={id}
        label={questionLabel(key)}
        registration={register(`texts.${key}`)}
        error={errors.texts?.[key]?.message}
        multiline
      />
    )
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newErgonomicAnalysisInLoco')}
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
      <Section title={t('ergonomicAnalysisInLocoForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label={t('pdf.ergonomicAnalysisInLoco.fields.date')}
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

          <TextField
            id="shift_schedules"
            label={t('pdf.ergonomicAnalysisInLoco.fields.shiftSchedules')}
            registration={register('shift_schedules')}
            error={errors.shift_schedules?.message}
          />

          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <TextField
            id="sector"
            label={t('pdf.ergonomicAnalysisInLoco.fields.sector')}
            registration={register('sector')}
            error={errors.sector?.message}
          />

          {/* The current area and fabric of the activity, only to read: the
              view shows them, as the legacy did; they are never sent. */}
          {readOnly && (
            <>
              <TextField
                id="location_area"
                label={t('pdf.ergonomicAnalysisInLoco.fields.area')}
                registration={register('location.area')}
              />
              <TextField
                id="location_fabric"
                label={t('pdf.ergonomicAnalysisInLoco.fields.fabric')}
                registration={register('location.fabric')}
              />
            </>
          )}
        </div>
      </Section>

      <Section
        title={t('ergonomicAnalysisInLocoForm.sections.questions')}
        description={
          readOnly
            ? undefined
            : t('ergonomicAnalysisInLocoForm.questionsDescription')
        }
      >
        {LAYOUT.map((item) =>
          item === 'timesAndCycles' ? (
            <Group
              key={item}
              title={t('pdf.ergonomicAnalysisInLoco.timesAndCycles')}
            >
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                {TIMES_AND_CYCLES.map(renderQuestion)}
              </div>
            </Group>
          ) : (
            renderQuestion(item)
          )
        )}
      </Section>
    </EvaluationFormLayout>
  )
}
