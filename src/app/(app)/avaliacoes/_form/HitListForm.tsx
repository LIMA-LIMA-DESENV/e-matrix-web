'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useMemo } from 'react'
import { type UseFormRegister, useForm } from 'react-hook-form'

import { Input } from '@/components/ui'
import { HIT_LIST_ITEMS } from '../components/hit-list-items'
import {
  ActivityField,
  answerId,
  EvaluationFormLayout,
  Field,
  fieldsetResetClasses,
  Group,
  inputClasses,
  Section,
  TextField,
  ThreeStateAnswer,
  useGuardedSubmit,
} from './form-parts'
import {
  EIGHT,
  FOUR,
  type HitListFormData,
  type HitListFormInput,
  hitListFormDefaultValues,
  makeHitListSchema,
  ROOT_CAUSE_LETTERS,
  TEN,
  type Translate,
} from './schema'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

type Register = UseFormRegister<HitListFormInput>

/** A text answer: a single line, or a text area with `multiline`. */
function TextAnswer({
  answerKey,
  label,
  register,
  error,
  multiline = false,
  className,
}: {
  answerKey: string
  label: string
  register: Register
  error?: string
  multiline?: boolean
  className?: string
}) {
  return (
    <TextField
      id={answerId(answerKey)}
      label={label}
      registration={register(`texts.${answerKey}`)}
      error={error}
      multiline={multiline}
      className={className}
    />
  )
}

/** A yes/no answer of the Hit List, in three states (FR-011). */
function FlagAnswer({
  answerKey,
  legend,
  register,
}: {
  answerKey: string
  legend: string
  register: Register
}) {
  const t = useTranslations('evaluations')

  return (
    <ThreeStateAnswer
      id={answerId(answerKey)}
      legend={legend}
      registration={register(`flags.${answerKey}`)}
      yesLabel={t('pdf.hitList.yes')}
      noLabel={t('pdf.hitList.no')}
    />
  )
}

export interface HitListFormProps {
  /** The record's code, the title of the edit and the view; absent to create. */
  code?: string
  initialValues?: HitListFormData
  /**
   * The view (FR-014): every control disabled, for real, and no "Salvar"
   * (NFR-004).
   */
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
  onSubmit?: (data: HitListFormData) => Promise<boolean>
}

/**
 * Create, edit and view form of a Hit List (J1 to J3, FR-011): the six
 * sections of the report, in its order, all in one react-hook-form instance
 * with no watch, so typing renders only the field (NFR-005). The texts and
 * questions are the ones of the PDF (FR-018). The deletion is not here: it
 * lives on the listing (D-7).
 */
export function HitListForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: HitListFormProps) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeHitListSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<HitListFormInput, unknown, HitListFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? hitListFormDefaultValues(),
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
  const typeLabel = t('types.hit_list')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } = useGuardedSubmit<HitListFormData>({
    readOnly,
    isReady: isActivitiesReady,
    onSubmit,
  })
  const isLocked = readOnly || isSubmitting || isSaved

  const itemNames = HIT_LIST_ITEMS.map((item) => t(`pdf.hitList.items.${item}`))
  const taskLabel = (n: number) => `${t('pdf.hitList.task')} ${n}`
  const rootCauseLabel = (n: number | string) =>
    `${t('pdf.hitList.rootCause')} ${n}`
  const textError = (key: string) => errors.texts?.[key]?.message

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('form.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newHitList')}
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
      <Section title={t('hitListForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <Field
            label={t('hitListForm.fields.assessmentDate')}
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

          {(['department', 'site', 'turn', 'station', 'product'] as const).map(
            (key) => (
              <TextAnswer
                key={key}
                answerKey={key}
                label={t(`hitListForm.fields.${key}`)}
                register={register}
                error={textError(key)}
              />
            )
          )}
        </div>
      </Section>

      <Section
        title={t('hitListForm.sections.tasks')}
        description={t('pdf.hitList.steps.tasks')}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {EIGHT.map((n) => (
            <TextAnswer
              key={n}
              answerKey={`task${n}`}
              label={taskLabel(n)}
              register={register}
              error={textError(`task${n}`)}
            />
          ))}
        </div>
      </Section>

      <Section
        title={t('hitListForm.sections.items')}
        description={t('pdf.hitList.steps.items')}
      >
        {HIT_LIST_ITEMS.map((item, index) => (
          <Group key={item} title={itemNames[index]}>
            <FlagAnswer
              answerKey={item}
              legend={t('hitListForm.fields.itemMark', {
                item: itemNames[index],
              })}
              register={register}
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {FOUR.map((n) => (
                <TextAnswer
                  key={n}
                  answerKey={`${item}Task${n}`}
                  label={taskLabel(n)}
                  register={register}
                  error={textError(`${item}Task${n}`)}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {FOUR.map((n) => (
                <TextAnswer
                  key={n}
                  answerKey={`${item}RootCause${n}`}
                  label={rootCauseLabel(n)}
                  register={register}
                  error={textError(`${item}RootCause${n}`)}
                />
              ))}
            </div>
            <TextAnswer
              answerKey={`${item}Improvements`}
              label={t('hitListForm.fields.itemImprovements')}
              register={register}
              error={textError(`${item}Improvements`)}
              multiline
            />
          </Group>
        ))}
      </Section>

      <Section
        title={t('hitListForm.sections.rootCauses')}
        description={t('pdf.hitList.steps.rootCauses')}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {ROOT_CAUSE_LETTERS.map((letter) => (
            <TextAnswer
              key={letter}
              answerKey={`rootCauses${letter}`}
              label={rootCauseLabel(letter)}
              register={register}
              error={textError(`rootCauses${letter}`)}
              multiline
            />
          ))}
        </div>
      </Section>

      <Section
        title={t('hitListForm.sections.improvements')}
        description={t('pdf.hitList.steps.improvements')}
      >
        {TEN.map((n) => (
          <Group key={n} title={t('hitListForm.fields.improvement', { n })}>
            <TextAnswer
              answerKey={`improvement${n}`}
              label={t('hitListForm.fields.improvementText', { n })}
              register={register}
              error={textError(`improvement${n}`)}
              multiline
            />
            <fieldset className={`${fieldsetResetClasses} space-y-2`}>
              <legend className="ml-1 text-sm font-semibold text-on-surface-variant">
                {t('hitListForm.fields.improvementItems', { n })}
              </legend>
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-5">
                {HIT_LIST_ITEMS.map((item, index) => {
                  const id = `${answerId(`improvement${n}Selected`)}-${item}`

                  return (
                    <label
                      key={item}
                      htmlFor={id}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-on-surface"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        value={item}
                        className="h-4 w-4 accent-primary"
                        {...register(`selections.improvement${n}Selected`)}
                      />
                      {itemNames[index]}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </Group>
        ))}
      </Section>

      <Section title={t('hitListForm.sections.closing')}>
        <Group title={t('pdf.hitList.steps.feedback')}>
          <FlagAnswer
            answerKey="isAnotherWorkstationAffected"
            legend={t('pdf.hitList.questions.anotherWorkstationAffected')}
            register={register}
          />
          <TextAnswer
            answerKey="anotherWorkstationAffected"
            label={t('pdf.hitList.questions.ifSoWhich')}
            register={register}
            error={textError('anotherWorkstationAffected')}
            multiline
          />
          <FlagAnswer
            answerKey="isCreatedOtherProblem"
            legend={t('pdf.hitList.questions.createdOtherProblem')}
            register={register}
          />
          <TextAnswer
            answerKey="createdOtherProblem"
            label={t('pdf.hitList.questions.ifSoExplain')}
            register={register}
            error={textError('createdOtherProblem')}
            multiline
          />
          <FlagAnswer
            answerKey="isProblemSolved"
            legend={t('pdf.hitList.questions.problemSolved')}
            register={register}
          />
        </Group>

        <Group title={t('pdf.hitList.steps.engineer')}>
          <FlagAnswer
            answerKey="isEngineeringAware"
            legend={t('pdf.hitList.questions.engineeringAware')}
            register={register}
          />
          <TextAnswer
            answerKey="engineeringAware"
            label={t('hitListForm.fields.engineeringAware')}
            register={register}
            error={textError('engineeringAware')}
          />
          <FlagAnswer
            answerKey="documentNeedUpdate"
            legend={t('pdf.hitList.questions.documentNeedUpdate')}
            register={register}
          />
          <TextAnswer
            answerKey="responsibleEngineeringToUpdateDoc"
            label={t('hitListForm.fields.responsibleEngineeringToUpdateDoc')}
            register={register}
            error={textError('responsibleEngineeringToUpdateDoc')}
          />
        </Group>
      </Section>
    </EvaluationFormLayout>
  )
}
