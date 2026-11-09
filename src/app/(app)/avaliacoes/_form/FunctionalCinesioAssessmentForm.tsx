'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo } from 'react'
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  useForm,
  useWatch,
} from 'react-hook-form'

import { Input, inputVariants } from '@/components/ui'

import {
  ageAtDate,
  FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS,
  FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY,
  FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES,
  FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS,
  FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS,
  FUNCTIONAL_CINESIO_ASSESSMENT_TEST_TABLES,
  type FunctionalCinesioAssessmentAnswer,
  type FunctionalCinesioAssessmentColumn,
  type FunctionalCinesioAssessmentExclusive,
  type FunctionalCinesioAssessmentHeaderField,
  type FunctionalCinesioAssessmentItem,
  type FunctionalCinesioAssessmentLabel,
  type FunctionalCinesioAssessmentLine,
  type FunctionalCinesioAssessmentMark,
  type FunctionalCinesioAssessmentSelect,
  type FunctionalCinesioAssessmentText,
} from '../components/functional-cinesio-assessment-fields'
import type { EvaluationFormProps } from '../definitions/types'
import {
  ActivityField,
  answerId,
  EvaluationFormLayout,
  Field,
  fieldsetResetClasses,
  inputClasses,
  OptionalChoiceAnswer,
  Section,
  textareaClasses,
  useGuardedSubmit,
} from './form-parts'
import {
  type FunctionalCinesioAssessmentFormData,
  type FunctionalCinesioAssessmentFormInput,
  functionalCinesioAssessmentFormDefaultValues,
  makeFunctionalCinesioAssessmentSchema,
  type Translate,
  toFunctionalCinesioAssessmentFormInput,
} from './schema'

type Label = FunctionalCinesioAssessmentLabel

/** What every piece of the form needs. Nothing here watches a value (NFR-006). */
interface FormTools {
  register: UseFormRegister<FunctionalCinesioAssessmentFormInput>
  control: Control<
    FunctionalCinesioAssessmentFormInput,
    unknown,
    FunctionalCinesioAssessmentFormData
  >
  errors: FieldErrors<FunctionalCinesioAssessmentFormInput>
  label: (label: Label) => string
}

/** The answers a D, an E or a "dedos" belongs to, for its accessible name. */
const CONDITIONS = new Map<
  FunctionalCinesioAssessmentAnswer,
  FunctionalCinesioAssessmentMark | FunctionalCinesioAssessmentExclusive
>(
  FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS.flatMap((group) =>
    group.rows.flat().flatMap((column) => column.lines.flat())
  ).flatMap((item) =>
    item.kind === 'mark' || item.kind === 'exclusive'
      ? [[item.key, item] as const]
      : []
  )
)

/** The name of what a control belongs to, as "Retroversão — D" (NFR-009). */
function conditionName(
  key: FunctionalCinesioAssessmentAnswer | undefined,
  label: (label: Label) => string
): string | undefined {
  const condition = key && CONDITIONS.get(key)
  if (!condition) return undefined

  const parent =
    condition.kind === 'mark'
      ? conditionName(condition.condition, label)
      : undefined

  return parent
    ? `${parent} — ${label(condition.label)}`
    : label(condition.label)
}

/**
 * The name of a control whose visible label is not enough, as the two "Tipo" of
 * the section II or the "Normal" of the Retropé and of the Antepé.
 */
function contextualName(context: string | undefined, name: string) {
  return context ? `${context} — ${name}` : undefined
}

/** The age on the date of the assessment, the only thing that watches them. */
function AgeOutput({ control }: { control: FormTools['control'] }) {
  const t = useTranslations('evaluations.functionalCinesioAssessmentFields')
  const [assessmentDate, birthDate] = useWatch({
    control,
    name: ['assessment_date', 'birth_date'],
  })
  const age = ageAtDate(birthDate, assessmentDate)

  return (
    <output aria-live="polite" className="font-semibold">
      {age === null ? null : t('age', { age })}
    </output>
  )
}

function MarkField({
  mark,
  context,
  tools,
}: {
  mark: FunctionalCinesioAssessmentMark
  context?: string
  tools: FormTools
}) {
  const id = answerId(mark.key)
  const name = tools.label(mark.label)

  return (
    <label
      htmlFor={id}
      className="inline-flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium text-on-surface"
    >
      <input
        id={id}
        type="checkbox"
        aria-label={contextualName(
          conditionName(mark.condition, tools.label) ?? context,
          name
        )}
        className="h-4 w-4 accent-primary"
        {...tools.register(`answers.${mark.key}`)}
      />
      {name}
    </label>
  )
}

/**
 * A Sim/Não or Adequado/Abaixo. The `Controller` observes only this answer, so a
 * click renders only this group, and no text observes it (R-30, NFR-006).
 */
function ExclusiveField({
  item,
  hideLegend,
  tools,
}: {
  item: FunctionalCinesioAssessmentExclusive
  hideLegend?: true
  tools: FormTools
}) {
  return (
    <Controller
      name={`answers.${item.key}`}
      control={tools.control}
      render={({ field: { value, onChange } }) => (
        <OptionalChoiceAnswer
          id={answerId(item.key)}
          legend={tools.label(item.label)}
          value={typeof value === 'boolean' ? value : null}
          onChange={onChange}
          yesLabel={tools.label(item.yes)}
          noLabel={tools.label(item.no)}
          hideLegend={hideLegend}
        />
      )}
    />
  )
}

/** A text or a measure: no `maxLength`, so the error shows instead of a cut. */
function AnswerField({
  item,
  context,
  describedBy,
  tools,
}: {
  item: FunctionalCinesioAssessmentText
  context?: string
  describedBy?: string
  tools: FormTools
}) {
  const id = answerId(item.key)
  const kind = FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS[item.key]
  const error = tools.errors.answers?.[item.key]?.message
  const label = tools.label(item.label)
  const shown =
    item.unit && item.unit !== item.label
      ? `${label} (${tools.label(item.unit)})`
      : label
  const props = {
    id,
    'aria-label': contextualName(
      conditionName(item.condition, tools.label) ?? context,
      shown
    ),
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    ...tools.register(`answers.${item.key}`),
  }

  return (
    <Field label={shown} htmlFor={id} error={error}>
      {kind === 'longText' ? (
        <textarea
          rows={3}
          className={inputVariants({ className: textareaClasses })}
          {...props}
        />
      ) : (
        <Input
          inputMode={
            kind === 'integer'
              ? 'numeric'
              : kind === 'number'
                ? 'decimal'
                : undefined
          }
          className={inputClasses}
          {...props}
        />
      )}
    </Field>
  )
}

function SelectField({
  item,
  tools,
}: {
  item: FunctionalCinesioAssessmentSelect
  tools: FormTools
}) {
  const t = useTranslations('evaluations')
  const id = answerId(item.key)

  return (
    <Field label={tools.label(item.label)} htmlFor={id}>
      <select
        id={id}
        className={inputVariants({
          className: `${inputClasses} w-full cursor-pointer text-sm text-on-surface`,
        })}
        {...tools.register(`answers.${item.key}`)}
      >
        <option value="">{t('form.noAnswer')}</option>
        {item.options.map((option) => (
          <option key={option.value} value={option.value}>
            {tools.label(option.label)}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** The name, the birth date with the age beside it, or the ID: all required. */
function HeaderField({
  item,
  tools,
}: {
  item: FunctionalCinesioAssessmentHeaderField
  tools: FormTools
}) {
  const error = tools.errors[item.field]?.message
  const isBirthDate = item.field === 'birth_date'

  return (
    <Field
      label={tools.label(item.label)}
      htmlFor={item.field}
      error={error}
      help={isBirthDate ? <AgeOutput control={tools.control} /> : undefined}
    >
      {/* Calendar day: sent as typed, never through Date. */}
      <Input
        id={item.field}
        type={isBirthDate ? 'date' : 'text'}
        aria-invalid={error ? true : undefined}
        aria-required
        className={inputClasses}
        {...tools.register(item.field)}
      />
    </Field>
  )
}

/** A group of independent marks with its legend (R-28). */
function MarksGroup({
  label,
  marks,
  tools,
}: {
  label: Label
  marks: readonly FunctionalCinesioAssessmentMark[]
  tools: FormTools
}) {
  return (
    <fieldset className={`${fieldsetResetClasses} space-y-2`}>
      <legend className="ml-1 text-sm font-semibold text-on-surface-variant">
        {tools.label(label)}
      </legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
        {marks.map((mark) => (
          <MarkField key={mark.key} mark={mark} tools={tools} />
        ))}
      </div>
    </fieldset>
  )
}

function SubHeading({ children }: { children: string }) {
  return <h3 className="text-base font-bold text-ematrix-dark">{children}</h3>
}

function itemKey(item: FunctionalCinesioAssessmentItem) {
  switch (item.kind) {
    case 'header':
      return item.field
    case 'markedText':
      return item.mark.key
    case 'marks':
    case 'caption':
      return item.label
    default:
      return item.key
  }
}

function LineItem({
  item,
  context,
  tools,
}: {
  item: FunctionalCinesioAssessmentItem
  context?: string
  tools: FormTools
}) {
  switch (item.kind) {
    case 'header':
      return <HeaderField item={item} tools={tools} />
    case 'select':
      return <SelectField item={item} tools={tools} />
    case 'exclusive':
      return <ExclusiveField item={item} tools={tools} />
    case 'mark':
      return <MarkField mark={item} context={context} tools={tools} />
    case 'text':
      return <AnswerField item={item} context={context} tools={tools} />
    case 'marks':
      return <MarksGroup label={item.label} marks={item.marks} tools={tools} />
    case 'caption':
      return <SubHeading>{tools.label(item.label)}</SubHeading>
    case 'markedText':
      return (
        <div className="space-y-2">
          <MarkField mark={item.mark} tools={tools} />
          <AnswerField
            item={{ ...item.text, label: 'description' }}
            context={tools.label(item.text.label)}
            tools={tools}
          />
        </div>
      )
  }
}

const LINE_COLUMNS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  5: 'md:grid-cols-3 xl:grid-cols-5',
}

/** Labels that mean nothing without the answer of the line before them. */
const CONTINUATION_LABELS: readonly Label[] = ['explain', 'description']

/**
 * The name of a line's Sim/Não or marks: the "Tipo" beside it, or the "Explique" on
 * the next line, is named after it (NFR-009).
 */
function lineTopic(line: FunctionalCinesioAssessmentLine) {
  return line.find((item) => item.kind === 'exclusive' || item.kind === 'marks')
}

function SectionLines({
  lines,
  tools,
}: {
  lines: readonly FunctionalCinesioAssessmentLine[]
  tools: FormTools
}) {
  return lines.map((line, index) => {
    const topic = lineTopic(line)
    const previous = index > 0 ? lineTopic(lines[index - 1]) : undefined

    return (
      <div
        key={itemKey(line[0])}
        className={`grid grid-cols-1 items-start gap-6 ${LINE_COLUMNS[line.length] ?? ''}`}
      >
        {line.map((item) => {
          const carried =
            item.kind === 'text' && CONTINUATION_LABELS.includes(item.label)
              ? previous
              : undefined
          const source = topic ?? carried

          return (
            <LineItem
              key={itemKey(item)}
              item={item}
              context={source ? tools.label(source.label) : undefined}
              tools={tools}
            />
          )
        })}
      </div>
    )
  })
}

/** The general and specific tests: fixed labels beside the two texts (R-19). */
function TestTables({ tools }: { tools: FormTools }) {
  return FUNCTIONAL_CINESIO_ASSESSMENT_TEST_TABLES.map((table) => (
    <div key={table.title} className="space-y-4">
      <SubHeading>{tools.label(table.title)}</SubHeading>
      <p className="ml-1 text-xs font-bold tracking-wide text-on-surface-variant uppercase">
        {tools.label('bodySegments')}
      </p>
      {table.segments.map((segment) => {
        const testsId = `tests-${segment.right.key}`
        const name = tools.label(segment.label)

        return (
          <div
            key={segment.right.key}
            className="grid grid-cols-1 items-start gap-4 rounded-xl border border-outline-variant/30 p-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="space-y-2">
              <p className="text-sm font-bold text-on-surface">{name}</p>
              <ul
                id={testsId}
                className="list-inside list-disc space-y-1 text-sm text-on-surface-variant"
              >
                {segment.tests.map((test) => (
                  <li key={test}>{tools.label(test)}</li>
                ))}
              </ul>
            </div>
            <AnswerField
              item={segment.right}
              context={name}
              describedBy={testsId}
              tools={tools}
            />
            <AnswerField
              item={segment.left}
              context={name}
              describedBy={testsId}
              tools={tools}
            />
          </div>
        )
      })}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {table.notes.map((note) => (
          <AnswerField key={note.key} item={note} tools={tools} />
        ))}
      </div>
    </div>
  ))
}

/**
 * A quantity of fingers, a free text: as on paper, "<value> dedos", on one line
 * that takes the room left, so the value is not cut.
 */
function FingersField({
  item,
  tools,
}: {
  item: FunctionalCinesioAssessmentText
  tools: FormTools
}) {
  const id = answerId(item.key)
  const error = tools.errors.answers?.[item.key]?.message
  const label = tools.label(item.label)

  return (
    <div className="min-w-0 flex-1 basis-32 space-y-1">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          aria-label={contextualName(
            conditionName(item.condition, tools.label),
            label
          )}
          aria-invalid={error ? true : undefined}
          className={`${inputClasses} min-w-0`}
          {...tools.register(`answers.${item.key}`)}
        />
        <label
          htmlFor={id}
          className="text-sm font-medium text-on-surface-variant"
        >
          {label}
        </label>
      </div>
      {error && <p className="text-xs font-medium text-error">{error}</p>}
    </div>
  )
}

/** A lone D, E or N, as of the ECOM, is named after its column (NFR-009). */
const SIDE_LABELS: readonly Label[] = ['sideD', 'sideE', 'sideN']

/** One body part: a fieldset, whose legend names the marks inside it. */
function PosturalColumn({
  column,
  scapulaeAlt,
  tools,
}: {
  column: FunctionalCinesioAssessmentColumn
  scapulaeAlt: string
  tools: FormTools
}) {
  let caption: string | undefined

  return (
    <fieldset
      className={`${fieldsetResetClasses} space-y-3 rounded-xl border border-outline-variant/30 p-4`}
    >
      <legend className="px-1 text-sm font-bold text-on-surface">
        {tools.label(column.title)}
      </legend>
      {column.figure === 'scapulae' && (
        <Image
          src={FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.scapulae.src}
          width={FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.scapulae.width}
          height={FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.scapulae.height}
          alt={scapulaeAlt}
          unoptimized
        />
      )}
      {column.lines.map((line) => {
        const first = line[0]
        if (first.kind === 'caption') {
          caption = tools.label(first.label)
          return (
            <p
              key={first.label}
              className="text-sm font-semibold text-on-surface-variant"
            >
              {caption}
            </p>
          )
        }
        const context = caption

        return (
          <div
            key={first.key}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            {line.map((item, index) => {
              const next = line[index + 1]
              switch (item.kind) {
                case 'mark': {
                  const field = (
                    <MarkField
                      key={item.key}
                      mark={item}
                      context={
                        context ??
                        (SIDE_LABELS.includes(item.label)
                          ? tools.label(column.title)
                          : undefined)
                      }
                      tools={tools}
                    />
                  )
                  // A D or an E with its "dedos": a line of their own, so the
                  // value fits and the two sides do not scatter.
                  return next?.kind === 'text' ? (
                    <div
                      key={item.key}
                      className="flex basis-full items-start gap-3"
                    >
                      <div className="pt-3">{field}</div>
                      <FingersField item={next} tools={tools} />
                    </div>
                  ) : (
                    field
                  )
                }
                case 'exclusive':
                  return (
                    <ExclusiveField
                      key={item.key}
                      item={item}
                      hideLegend={
                        item.label === column.title ? true : undefined
                      }
                      tools={tools}
                    />
                  )
                case 'text':
                  return line[index - 1]?.kind === 'mark' ? null : (
                    <FingersField key={item.key} item={item} tools={tools} />
                  )
                default:
                  return null
              }
            })}
          </div>
        )
      })}
    </fieldset>
  )
}

function PosturalGroups({
  scapulaeAlt,
  tools,
}: {
  scapulaeAlt: string
  tools: FormTools
}) {
  return FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS.map((group) => (
    <div key={group.id} className="space-y-4">
      <SubHeading>{tools.label(group.title)}</SubHeading>
      {group.rows.map((row) => (
        <div
          key={row[0].title}
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]"
        >
          {row.map((column) => (
            <PosturalColumn
              key={column.title}
              column={column}
              scapulaeAlt={scapulaeAlt}
              tools={tools}
            />
          ))}
        </div>
      ))}
    </div>
  ))
}

/** Each measure of the section VII beside its Adequado/Abaixo (R-24, R-25). */
function Dynamometry({ tools }: { tools: FormTools }) {
  return FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY.map(({ value, result }) => (
    <div
      key={value.key}
      className="grid grid-cols-1 items-end gap-4 md:grid-cols-2"
    >
      <AnswerField item={value} tools={tools} />
      <ExclusiveField item={result} hideLegend tools={tools} />
    </div>
  ))
}

/**
 * Create, edit and view form of an Avaliação Cinesiofuncional (J1 to J3, FR-018): one
 * page and one react-hook-form instance, walking the data of
 * `functional-cinesio-assessment-fields.ts` through the sections I to VII.
 *
 * With 223 answers, nothing observes the whole form (NFR-006): the marks and the
 * texts are only registered, `AgeOutput` observes the two dates and each
 * `ExclusiveField` its own answer. A D or an E is a mark of its own, beside its
 * condition and independent from it (R-28). The deletion lives on the listing.
 */
export function FunctionalCinesioAssessmentForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: EvaluationFormProps<FunctionalCinesioAssessmentFormData>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const tl = useTranslations('evaluations.functionalCinesioAssessmentFields')
  const locale = useLocale()
  const format = useFormatter()

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () =>
      makeFunctionalCinesioAssessmentSchema(tv as unknown as Translate, locale),
    [tv, locale]
  )

  // The measures in the user's number format, as they were saved.
  const toControlValues = useCallback(
    (values: FunctionalCinesioAssessmentFormData) =>
      toFunctionalCinesioAssessmentFormInput(values, (value) =>
        format.number(value, { maximumFractionDigits: 20 })
      ),
    [format]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<
    FunctionalCinesioAssessmentFormInput,
    unknown,
    FunctionalCinesioAssessmentFormData
  >({
    resolver: zodResolver(schema),
    defaultValues: toControlValues(
      initialValues ?? functionalCinesioAssessmentFormDefaultValues()
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
  const typeLabel = t('types.functional_cinesio_assessment')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } =
    useGuardedSubmit<FunctionalCinesioAssessmentFormData>({
      readOnly,
      isReady: isActivitiesReady,
      onSubmit: onSubmit ? (data) => onSubmit(data) : undefined,
    })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('functionalCinesioAssessmentForm.newDescription', { type: typeLabel })
      : t('form.editDescription', { type: typeLabel })
  }

  const tools: FormTools = {
    register,
    control,
    errors,
    label: (label) => tl(`labels.${label}`),
  }
  const posture = FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.posture

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newFunctionalCinesioAssessment')}
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
      <Section title={t('functionalCinesioAssessmentForm.assessmentSection')}>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <Field
            label={tools.label('assessmentDate')}
            htmlFor="assessment_date"
            error={errors.assessment_date?.message}
          >
            {/* Calendar day: sent as typed, never through Date. */}
            <Input
              id="assessment_date"
              type="date"
              aria-invalid={errors.assessment_date ? true : undefined}
              aria-required
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
        </div>
      </Section>

      {FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS.map((section) => (
        <Section
          key={section.id}
          title={`${section.number} – ${tools.label(section.title)}`}
        >
          {section.id === 'posturalFlexibility' ? (
            <>
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-6">
                  <SectionLines lines={section.lines} tools={tools} />
                </div>
                <Image
                  src={posture.src}
                  width={posture.width}
                  height={posture.height}
                  alt={t('functionalCinesioAssessmentForm.postureFigure')}
                  unoptimized
                />
              </div>
              <p className="text-sm font-medium text-on-surface-variant">
                {t('functionalCinesioAssessmentForm.testsDescription')}
              </p>
              <TestTables tools={tools} />
            </>
          ) : (
            <>
              {section.id === 'posturalMarks' && (
                <PosturalGroups
                  scapulaeAlt={t(
                    'functionalCinesioAssessmentForm.scapulaeFigure'
                  )}
                  tools={tools}
                />
              )}
              {section.id === 'dynamometry' && <Dynamometry tools={tools} />}
              <SectionLines lines={section.lines} tools={tools} />
            </>
          )}
        </Section>
      ))}
    </EvaluationFormLayout>
  )
}
