'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFormatter, useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useMemo } from 'react'
import { type Control, useForm, useWatch } from 'react-hook-form'

import { Input } from '@/components/ui'
import {
  CHECKLIST_BLOCKS,
  type ChecklistBlockName,
  checklistExpectedAnswer,
  computeChecklistScore,
  formatChecklistPercentage,
} from '../components/checklist-blocks'
import {
  ActivityField,
  answerId,
  EvaluationFormLayout,
  Field,
  Group,
  inputClasses,
  Section,
  TextField,
  ThreeStateAnswer,
  useGuardedSubmit,
} from './form-parts'
import {
  type ChecklistFormData,
  type ChecklistFormInput,
  checklistFormDefaultValues,
  makeChecklistSchema,
  type Translate,
  toChecklistAnswers,
} from './schema'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

const BANDS = ['excellent', 'good', 'reasonable', 'bad', 'terrible'] as const

type ChecklistControl = Control<ChecklistFormInput, unknown, ChecklistFormData>

/**
 * The score of the answers as they are now (J5, FR-013). Only the 55 answers
 * are watched, never the whole form, so typing the name renders nothing here;
 * each block and the average subscribe on their own.
 */
function useLiveChecklistScore(control: ChecklistControl) {
  const answers = useWatch({ control, name: 'answers' })
  return useMemo(
    () => computeChecklistScore(toChecklistAnswers(answers)),
    [answers]
  )
}

function usePercentage() {
  const format = useFormatter()
  return (value: number | null | undefined) =>
    formatChecklistPercentage(
      (number, options) => format.number(number, options),
      value
    )
}

/** A value of the score with its label, in one line. */
function ScoreValue({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}:{' '}
      <span className="font-bold text-ematrix-dark tabular-nums">{value}</span>
    </span>
  )
}

/**
 * The sum and the percentage of one block, below its questions. A polite
 * live region (NFR-004): answering a question of the block announces its new
 * score, without interrupting.
 */
function BlockScore({
  control,
  block,
}: {
  control: ChecklistControl
  block: ChecklistBlockName
}) {
  const t = useTranslations('evaluations')
  const percentage = usePercentage()
  const score = useLiveChecklistScore(control).blocks.find(
    (item) => item.block === block
  )

  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-outline-variant/30 pt-4 text-sm font-medium text-on-surface-variant"
    >
      <ScoreValue
        label={t('pdf.checklist.pointsSum')}
        value={score ? String(score.sum) : ''}
      />
      <ScoreValue
        label={t('pdf.checklist.percentage')}
        value={percentage(score?.percentage)}
      />
    </p>
  )
}

/**
 * The average of the 11 blocks, the overall classification, at the foot of
 * the form, beside the bands it is read against. Blank while no question is
 * answered. A polite live region (NFR-004).
 */
function AverageScore({ control }: { control: ChecklistControl }) {
  const t = useTranslations('evaluations')
  const percentage = usePercentage()
  const { average } = useLiveChecklistScore(control)

  return (
    <div className="space-y-4">
      <p
        aria-live="polite"
        aria-atomic="true"
        className="rounded-xl bg-surface-container-high px-5 py-4 text-base font-semibold text-on-surface-variant"
      >
        <ScoreValue
          label={t('pdf.checklist.globalClassification')}
          value={percentage(average)}
        />
      </p>
      <div className="text-sm text-on-surface-variant">
        <p className="mb-2 font-medium">{t('pdf.checklist.legendTitle')}</p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {BANDS.map((band) => (
            <li key={band}>
              <span className="font-semibold">
                {t(`pdf.checklist.bands.${band}.range`)}
              </span>
              : {t(`pdf.checklist.bands.${band}.label`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export interface ChecklistFormProps {
  /** The record's code, the title of the edit and the view; absent to create. */
  code?: string
  initialValues?: ChecklistFormData
  /**
   * The view (FR-014): every control disabled, for real, and no "Salvar"
   * (NFR-004). The score is still shown (R-12).
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
  onSubmit?: (data: ChecklistFormData) => Promise<boolean>
}

/**
 * Create, edit and view form of a Coleta de Dados In Loco (J1 to J3, J5,
 * FR-012): the identification and the 11 blocks of the report, in its order,
 * each question with yes, no and no answer, the option that scores worth 1.
 * Each block shows its sum and percentage and the foot the average, computed
 * live with the rule of the API (FR-013, D-3). The texts and questions are
 * the ones of the PDF (FR-018). The deletion is not here: it lives on the
 * listing (D-7).
 */
export function ChecklistForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: ChecklistFormProps) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeChecklistSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ChecklistFormInput, unknown, ChecklistFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? checklistFormDefaultValues(),
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
  const typeLabel = t('types.checklist')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } = useGuardedSubmit<ChecklistFormData>({
    readOnly,
    isReady: isActivitiesReady,
    onSubmit,
  })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('checklistForm.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newChecklist')}
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
      <Section title={t('checklistForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <TextField
            id="name"
            label={t('checklistForm.fields.name')}
            registration={register('name')}
            error={errors.name?.message}
          />

          <TextField
            id="sector"
            label={t('checklistForm.fields.sector')}
            registration={register('sector')}
            error={errors.sector?.message}
          />

          <Field
            label={t('checklistForm.fields.date')}
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
        title={t('checklistForm.sections.questions')}
        description={t('checklistForm.questionsDescription')}
      >
        {CHECKLIST_BLOCKS.map(({ block, questions }) => (
          <Group
            key={block}
            title={t(`pdf.checklist.blocks.${block}`)}
            footer={<BlockScore control={control} block={block} />}
          >
            {questions.map((n) => {
              const expected = checklistExpectedAnswer(n)

              return (
                <ThreeStateAnswer
                  key={n}
                  id={answerId(`question${n}`)}
                  legend={`${n}. ${t(`pdf.checklist.questions.question${n}`)}`}
                  registration={register(`answers.question${n}`)}
                  yesLabel={t('pdf.checklist.yes', {
                    points: expected ? 1 : 0,
                  })}
                  noLabel={t('pdf.checklist.no', { points: expected ? 0 : 1 })}
                />
              )
            })}
          </Group>
        ))}
      </Section>

      <Section title={t('checklistForm.sections.score')}>
        <AverageScore control={control} />
      </Section>
    </EvaluationFormLayout>
  )
}
