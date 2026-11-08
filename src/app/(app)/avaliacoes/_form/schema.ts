import { z } from 'zod'

import type {
  ChangeAssessment,
  ChangeAssessmentInput,
  Checklist,
  ChecklistAnswersInput,
  ChecklistInput,
  ErgonomicAnalysisInLoco,
  ErgonomicAnalysisInLocoInput,
  ErgonomicAnalysisInLocoInputAnswers,
  ErgonomicWorkAnalysis,
  ErgonomicWorkAnalysisAdvanced,
  ErgonomicWorkAnalysisAdvancedInput,
  ErgonomicWorkAnalysisInput,
  ErgonomicWorkAnalysisInputAnswers,
  HitList,
  HitListAnswersInput,
  HitListInput,
  PriorityCriterion,
  PriorityCriterionInput,
  PriorityCriterionInputAnswers,
  RiskFactor,
  RiskFactorInput,
  RiskFactorInputAnswers,
} from '@/http/api'
import { defaultLocale } from '@/i18n/config'

import {
  CHANGE_ASSESSMENT_QUESTIONS,
  type ChangeAssessmentQuestion,
} from '../components/change-assessment-questions'
import {
  CHECKLIST_QUESTION_KEYS,
  type ChecklistQuestionKey,
} from '../components/checklist-blocks'
import {
  ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS,
  type ErgonomicAnalysisInLocoQuestion,
} from '../components/ergonomic-analysis-in-loco-questions'
import {
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS,
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS,
  type ErgonomicWorkAnalysisAdvancedColumn,
  type ErgonomicWorkAnalysisAdvancedTable,
  type ErgonomicWorkAnalysisAdvancedTextAnswer,
  MAX_EVALUATION_ROWS,
} from '../components/ergonomic-work-analysis-advanced-fields'
import {
  ERGONOMIC_WORK_ANALYSIS_ANSWERS,
  ERGONOMIC_WORK_ANALYSIS_MAX_INTEGER,
  ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS,
  ERGONOMIC_WORK_ANALYSIS_MEASURES,
  ERGONOMIC_WORK_ANALYSIS_SECTOR_MAX_LENGTH,
  ERGONOMIC_WORK_ANALYSIS_TEXT_ANSWERS,
  type ErgonomicWorkAnalysisMeasure,
  type ErgonomicWorkAnalysisMeasureRule,
  type ErgonomicWorkAnalysisTextAnswer,
} from '../components/ergonomic-work-analysis-fields'
import { HIT_LIST_ITEMS } from '../components/hit-list-items'
import {
  PRIORITY_CRITERION_CATEGORIES,
  PRIORITY_CRITERION_QUESTIONS,
  type PriorityCriterionQuestionField,
  type PriorityCriterionSolutionKey,
} from '../components/priority-criterion-questions'
import {
  RISK_FACTOR_KEYS,
  type RiskFactorKey,
} from '../components/risk-factor-board'

/**
 * The longest text answer the API accepts, in code points after the trim:
 * `MAX_EVALUATION_TEXT_LENGTH` on the server (FR-008, H-1).
 */
export const MAX_EVALUATION_TEXT_LENGTH = 5000

/**
 * The longest name and sector of a Coleta de Dados, in code points after the
 * trim: the `varchar(255)` of the columns (FR-007).
 */
export const MAX_CHECKLIST_TEXT_LENGTH = 255

export type Translate = (key: string, values?: Record<string, number>) => string

export type HitListItemKey = (typeof HIT_LIST_ITEMS)[number]

export const FOUR = [1, 2, 3, 4] as const
export const EIGHT = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const ROOT_CAUSE_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
] as const

/**
 * The text answers of the Hit List catalog (spec §9), in the order of the
 * form: identification, tasks, the four tasks, four root causes and the
 * improvements of each item, the general root causes, the ten improvements
 * and the complements of the closing questions.
 */
export const HIT_LIST_TEXT_KEYS: readonly string[] = [
  'department',
  'site',
  'turn',
  'station',
  'product',
  ...EIGHT.map((n) => `task${n}`),
  ...HIT_LIST_ITEMS.flatMap((item) => [
    ...FOUR.map((n) => `${item}Task${n}`),
    ...FOUR.map((n) => `${item}RootCause${n}`),
    `${item}Improvements`,
  ]),
  ...ROOT_CAUSE_LETTERS.map((letter) => `rootCauses${letter}`),
  ...TEN.map((n) => `improvement${n}`),
  'anotherWorkstationAffected',
  'createdOtherProblem',
  'engineeringAware',
  'responsibleEngineeringToUpdateDoc',
]

/** The yes/no answers: the mark of each item and the closing questions. */
export const HIT_LIST_FLAG_KEYS: readonly string[] = [
  ...HIT_LIST_ITEMS,
  'isAnotherWorkstationAffected',
  'isCreatedOtherProblem',
  'isProblemSolved',
  'isEngineeringAware',
  'documentNeedUpdate',
]

/** The items each suggested improvement addresses. */
export const HIT_LIST_SELECTION_KEYS: readonly string[] = TEN.map(
  (n) => `improvement${n}Selected`
)

/**
 * A yes/no answer as its radio group holds it: `''` is "no answer", which
 * the API stores as absent (FR-011, three states).
 */
export type FlagValue = '' | 'true' | 'false'

// `input type="date"` yields `YYYY-MM-DD` (or '' when empty); the value is sent
// as is, never converted to a Date.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * A real calendar day in `YYYY-MM-DD`, like `isCalendarDate` on the server:
 * `2026-02-30` and `2026-13-01` are refused. Computed in UTC, so no time zone
 * can move the day.
 */
function isCalendarDay(value: string) {
  const match = DATE_ONLY.exec(value)
  if (!match) return false

  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Length as the API counts it: by code point, after the trim (JSON body). */
function answerLength(value: string) {
  return [...value.trim()].length
}

/**
 * A group of checkboxes sharing a name gives an array of the checked values;
 * anything else (none rendered yet) counts as nothing checked.
 */
function toArray(value: unknown) {
  if (Array.isArray(value)) return value
  return typeof value === 'string' && value ? [value] : []
}

/** One entry per key, all with the same value (a zod type or a default). */
function shapeOf<T>(keys: readonly string[], value: T): Record<string, T> {
  return Object.fromEntries(keys.map((key) => [key, value]))
}

/**
 * Mirrors the API rules of a Hit List write (FR-007, FR-008 with D-1): the
 * activity chosen among the listed ones, a real assessment date, every text
 * within the limit and the yes/no answers in three states. The API stays the
 * authority, including whether the activity still exists.
 */
export function makeHitListSchema(tv: Translate) {
  const text = z
    .string()
    .refine((value) => answerLength(value) <= MAX_EVALUATION_TEXT_LENGTH, {
      message: tv('textTooLong', { max: MAX_EVALUATION_TEXT_LENGTH }),
    })
  const flag = z.enum(['', 'true', 'false'])
  const selection = z.preprocess(toArray, z.array(z.enum(HIT_LIST_ITEMS)))

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    assessment_date: z
      .string()
      .refine(isCalendarDay, tv('assessmentDateRequired')),
    texts: z.object(shapeOf(HIT_LIST_TEXT_KEYS, text)),
    flags: z.object(shapeOf(HIT_LIST_FLAG_KEYS, flag)),
    selections: z.object(shapeOf(HIT_LIST_SELECTION_KEYS, selection)),
  })
}

export type HitListFormInput = z.input<ReturnType<typeof makeHitListSchema>>
export type HitListFormData = z.output<ReturnType<typeof makeHitListSchema>>

/** An empty Hit List: every text blank, no answer and nothing selected. */
export function hitListFormDefaultValues(): HitListFormData {
  return {
    activity_id: '',
    assessment_date: '',
    texts: shapeOf(HIT_LIST_TEXT_KEYS, ''),
    flags: shapeOf<FlagValue>(HIT_LIST_FLAG_KEYS, ''),
    selections: Object.fromEntries(
      HIT_LIST_SELECTION_KEYS.map((key) => [key, []])
    ),
  }
}

/**
 * A stored Hit List as the form holds it. An answer of another type than its
 * kind is blank, as in the PDF.
 */
export function toHitListFormValues(hitList: HitList): HitListFormData {
  const answers = hitList.answers as unknown as Record<string, unknown>

  return {
    activity_id: hitList.activity.id,
    assessment_date: hitList.assessment_date,
    texts: Object.fromEntries(
      HIT_LIST_TEXT_KEYS.map((key) => {
        const value = answers[key]
        return [key, typeof value === 'string' ? value : '']
      })
    ),
    flags: Object.fromEntries(
      HIT_LIST_FLAG_KEYS.map((key): [string, FlagValue] => {
        const value = answers[key]
        return [key, typeof value === 'boolean' ? `${value}` : '']
      })
    ),
    selections: Object.fromEntries(
      HIT_LIST_SELECTION_KEYS.map((key) => {
        const value = answers[key]
        const marked: readonly unknown[] = Array.isArray(value) ? value : []
        return [key, HIT_LIST_ITEMS.filter((item) => marked.includes(item))]
      })
    ),
  }
}

/**
 * The body of `POST`/`PUT /evaluations/hit-lists` (FR-003, FR-005). Only the
 * answered keys go: a blank text, "no answer" and an empty selection are left
 * out, which the API stores as absent; the `PUT` replaces every answer, so
 * what was emptied is cleared. The selections go in the order of the items
 * (`HIT_LIST_ITEMS`), whatever the order they were checked in.
 */
export function toHitListInput(data: HitListFormData): HitListInput {
  const answers: Record<string, string | boolean | string[]> = {}

  for (const key of HIT_LIST_TEXT_KEYS) {
    const value = data.texts[key]?.trim()
    if (value) answers[key] = value
  }

  for (const key of HIT_LIST_FLAG_KEYS) {
    const value = data.flags[key]
    if (value) answers[key] = value === 'true'
  }

  for (const key of HIT_LIST_SELECTION_KEYS) {
    const selected = data.selections[key] ?? []
    const ordered = HIT_LIST_ITEMS.filter((item) => selected.includes(item))
    if (ordered.length > 0) answers[key] = ordered
  }

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    assessment_date: data.assessment_date,
    answers: answers as HitListAnswersInput,
  }
}

/**
 * Mirrors the API rules of a Coleta de Dados write (FR-007 with D-1, FR-008):
 * the activity chosen among the listed ones, a name and a sector not blank
 * after the trim and of at most 255 code points, a real date and the 55
 * answers in three states (R-4: a question may stay unanswered). The API
 * stays the authority, including whether the activity still exists.
 */
export function makeChecklistSchema(tv: Translate) {
  const requiredText = (requiredMessage: string) =>
    z
      .string()
      .refine((value) => value.trim().length > 0, { message: requiredMessage })
      .refine((value) => answerLength(value) <= MAX_CHECKLIST_TEXT_LENGTH, {
        message: tv('textTooLong', { max: MAX_CHECKLIST_TEXT_LENGTH }),
      })
  const flag = z.enum(['', 'true', 'false'])

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    name: requiredText(tv('nameRequired')),
    sector: requiredText(tv('sectorRequired')),
    date: z.string().refine(isCalendarDay, tv('checklistDateRequired')),
    answers: z.object(shapeOf(CHECKLIST_QUESTION_KEYS, flag)),
  })
}

export type ChecklistFormInput = z.input<ReturnType<typeof makeChecklistSchema>>
export type ChecklistFormData = z.output<ReturnType<typeof makeChecklistSchema>>

/** An empty Coleta de Dados: no identification and no answer. */
export function checklistFormDefaultValues(): ChecklistFormData {
  return {
    activity_id: '',
    name: '',
    sector: '',
    date: '',
    answers: shapeOf<FlagValue>(CHECKLIST_QUESTION_KEYS, ''),
  }
}

/**
 * A stored Coleta de Dados as the form holds it. An answer that is not a
 * boolean is no answer, as in the PDF and in the API score.
 */
export function toChecklistFormValues(checklist: Checklist): ChecklistFormData {
  const answers = checklist.answers as unknown as Record<string, unknown>

  return {
    activity_id: checklist.activity.id,
    name: checklist.name,
    sector: checklist.sector,
    date: checklist.date,
    answers: Object.fromEntries(
      CHECKLIST_QUESTION_KEYS.map((key): [string, FlagValue] => {
        const value = answers[key]
        return [key, typeof value === 'boolean' ? `${value}` : '']
      })
    ),
  }
}

/**
 * The answers of the form as the API holds them: `true`, `false`, or absent
 * for "no answer". The live score is computed from them (FR-013).
 */
export function toChecklistAnswers(
  values: Readonly<Partial<Record<string, string | undefined>>> | undefined
): Partial<Record<ChecklistQuestionKey, boolean>> {
  const answers: Partial<Record<ChecklistQuestionKey, boolean>> = {}

  for (const key of CHECKLIST_QUESTION_KEYS) {
    const value = values?.[key]
    if (value === 'true' || value === 'false') answers[key] = value === 'true'
  }

  return answers
}

/**
 * The body of `POST`/`PUT /evaluations/checklists` (FR-004, FR-005): the name
 * and the sector trimmed, the date as typed and only the answered questions;
 * the `PUT` replaces every answer, so what was cleared is cleared.
 */
export function toChecklistInput(data: ChecklistFormData): ChecklistInput {
  return {
    activity_id: data.activity_id,
    name: data.name.trim(),
    sector: data.sector.trim(),
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    date: data.date,
    answers: toChecklistAnswers(data.answers) as ChecklistAnswersInput,
  }
}

/**
 * Mirrors the API rules of an Avaliação de Mudanças / Projetos write
 * (FR-004, FR-015): the activity chosen among the listed ones, a real
 * assessment date, not compared with the periods, and each of the 8 answers
 * optional, of at most 5,000 code points after the trim. The API stays the
 * authority, including whether the activity still exists.
 */
export function makeChangeAssessmentSchema(tv: Translate) {
  const text = z
    .string()
    .refine((value) => answerLength(value) <= MAX_EVALUATION_TEXT_LENGTH, {
      message: tv('textTooLong', { max: MAX_EVALUATION_TEXT_LENGTH }),
    })

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    assessment_date: z
      .string()
      .refine(isCalendarDay, tv('assessmentDateRequired')),
    answers: z.object(shapeOf(CHANGE_ASSESSMENT_QUESTIONS, text)),
  })
}

export type ChangeAssessmentFormInput = z.input<
  ReturnType<typeof makeChangeAssessmentSchema>
>
export type ChangeAssessmentFormData = z.output<
  ReturnType<typeof makeChangeAssessmentSchema>
>

/** An empty Avaliação de Mudanças / Projetos: no identification, no answer. */
export function changeAssessmentFormDefaultValues(): ChangeAssessmentFormData {
  return {
    activity_id: '',
    assessment_date: '',
    answers: shapeOf(CHANGE_ASSESSMENT_QUESTIONS, ''),
  }
}

/**
 * A stored Avaliação de Mudanças / Projetos as the form holds it: an absent
 * answer (`null`) is a blank text area.
 */
export function toChangeAssessmentFormValues(
  changeAssessment: ChangeAssessment
): ChangeAssessmentFormData {
  return {
    activity_id: changeAssessment.activity.id,
    assessment_date: changeAssessment.assessment_date,
    answers: Object.fromEntries(
      CHANGE_ASSESSMENT_QUESTIONS.map((key) => [
        key,
        changeAssessment.answers[key] ?? '',
      ])
    ),
  }
}

/**
 * The body of `POST`/`PUT /evaluations/change-assessments` (FR-005, FR-006):
 * the date as typed and the 8 answers trimmed, keeping their inner line
 * breaks; a blank one goes as `null`, which the API stores as absent, so the
 * `PUT` clears an answer that was emptied.
 */
export function toChangeAssessmentInput(
  data: ChangeAssessmentFormData
): ChangeAssessmentInput {
  const answers = Object.fromEntries(
    CHANGE_ASSESSMENT_QUESTIONS.map(
      (key): [ChangeAssessmentQuestion, string | null] => [
        key,
        data.answers[key]?.trim() || null,
      ]
    )
  )

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    assessment_date: data.assessment_date,
    answers,
  }
}

/**
 * The longest shift schedule and sector of a Coleta de Dados In Loco —
 * Produção, in code points after the trim: the `varchar(255)` of the columns
 * (FR-005).
 */
export const MAX_ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_LENGTH = 255

/** The numeric question 5, "Quantas vezes a atividade é realizada no turno?". */
export const ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION = 'timesPerShift'

type ErgonomicAnalysisInLocoTextQuestion = Exclude<
  ErgonomicAnalysisInLocoQuestion,
  typeof ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION
>

/** The 19 text questions, plain multiline text (R-9), in the order of R-7. */
export const ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_QUESTIONS =
  ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.filter(
    (key): key is ErgonomicAnalysisInLocoTextQuestion =>
      key !== ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION
  )

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * A number typed in the user's locale (FR-015, RK-4): `null` when blank,
 * `NaN` when it is not a plain number. Spaces are ignored. A value grouped
 * the locale's way, with its decimal separator or none, is read the locale's
 * way: "1.000" is a thousand in pt-BR and es, "1,000" in en. Anything else
 * takes a comma or a point as the decimal separator, so "2,5" and "2.5" are
 * both 2.5 in every locale. A sign, an exponent or a second separator, as in
 * "-1", "1e3" or "2,5,1", is not a plain number.
 *
 * With `signed` (FR-018), one leading `-` may come before any of those forms
 * and gives the opposite of the value read: "-2,5", "-2.5" and "-1.000" in
 * pt-BR are -2.5, -2.5 and -1000. "--1", "2-" and a lone "-" are still `NaN`.
 * Without it, "-1" stays `NaN`, as for the CDIP and the FR.
 */
export function parseLocaleDecimal(
  raw: string,
  locale: string,
  options: { signed?: boolean } = {}
): number | null {
  const value = raw.replace(/[\s  ]/g, '')
  if (!value) return null

  if (options.signed && value.startsWith('-')) {
    const magnitude = parseLocaleDecimal(value.slice(1), locale)
    return magnitude === null ? Number.NaN : -magnitude
  }

  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5)
  const group = parts.find((part) => part.type === 'group')?.value ?? ''
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'

  if (group.trim()) {
    const grouped = new RegExp(
      `^\\d{1,3}(?:${escapeRegExp(group)}\\d{3})+(?:${escapeRegExp(decimal)}\\d+)?$`
    )
    if (grouped.test(value)) {
      return Number(value.split(group).join('').replace(decimal, '.'))
    }
  }

  if (/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value)) {
    return Number(value.replace(',', '.'))
  }

  return Number.NaN
}

/**
 * Mirrors the API rules of a Coleta de Dados In Loco — Produção write
 * (FR-005, FR-015): the activity chosen among the listed ones, a real date,
 * not compared with the periods, the shift schedule and the sector not blank
 * after the trim and of at most 255 code points, question 5 blank or a
 * number of at least zero typed in the user's `locale`, which it becomes
 * (H-5), and the 19 texts optional, of at most 5,000 code points. Area and
 * fabric are shown by the view only: kept as they come, never sent. The API
 * stays the authority, including whether the activity still exists.
 */
export function makeErgonomicAnalysisInLocoSchema(
  tv: Translate,
  locale: string = defaultLocale
) {
  const requiredText = (requiredMessage: string) =>
    z
      .string()
      .refine((value) => value.trim().length > 0, { message: requiredMessage })
      .refine(
        (value) =>
          answerLength(value) <= MAX_ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_LENGTH,
        {
          message: tv('textTooLong', {
            max: MAX_ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_LENGTH,
          }),
        }
      )
  const text = z
    .string()
    .refine((value) => answerLength(value) <= MAX_EVALUATION_TEXT_LENGTH, {
      message: tv('textTooLong', { max: MAX_EVALUATION_TEXT_LENGTH }),
    })

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    date: z.string().refine(isCalendarDay, tv('checklistDateRequired')),
    shift_schedules: requiredText(tv('shiftSchedulesRequired')),
    sector: requiredText(tv('sectorRequired')),
    location: z.object({ area: z.string(), fabric: z.string() }),
    timesPerShift: z.string().transform((value, ctx) => {
      const parsed = parseLocaleDecimal(value, locale)
      if (parsed === null) return null
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({ code: 'custom', message: tv('timesPerShiftInvalid') })
        return z.NEVER
      }
      return parsed
    }),
    texts: z.object(shapeOf(ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_QUESTIONS, text)),
  })
}

/** The form as its controls hold it: question 5 as typed. */
export type ErgonomicAnalysisInLocoFormInput = z.input<
  ReturnType<typeof makeErgonomicAnalysisInLocoSchema>
>
/** The form once valid: question 5 as a number, or `null` when blank. */
export type ErgonomicAnalysisInLocoFormData = z.output<
  ReturnType<typeof makeErgonomicAnalysisInLocoSchema>
>

/** An empty Coleta de Dados In Loco — Produção: no field and no answer. */
export function ergonomicAnalysisInLocoFormDefaultValues(): ErgonomicAnalysisInLocoFormData {
  return {
    activity_id: '',
    date: '',
    shift_schedules: '',
    sector: '',
    location: { area: '', fabric: '' },
    timesPerShift: null,
    texts: shapeOf(ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_QUESTIONS, ''),
  }
}

/**
 * A stored Coleta de Dados In Loco — Produção as the form holds it, with the
 * current area and fabric of its activity for the view (R-6). An absent
 * answer (`null`) is blank.
 */
export function toErgonomicAnalysisInLocoFormValues(
  record: ErgonomicAnalysisInLoco
): ErgonomicAnalysisInLocoFormData {
  const timesPerShift = record.answers.timesPerShift

  return {
    activity_id: record.activity.id,
    date: record.date,
    shift_schedules: record.shift_schedules,
    sector: record.sector,
    location: { area: record.activity.area, fabric: record.activity.fabric },
    timesPerShift: typeof timesPerShift === 'number' ? timesPerShift : null,
    texts: Object.fromEntries(
      ERGONOMIC_ANALYSIS_IN_LOCO_TEXT_QUESTIONS.map((key) => [
        key,
        record.answers[key] ?? '',
      ])
    ),
  }
}

/**
 * The values of the controls: question 5 written in the user's number format
 * (`formatNumber`), so "2,5" in pt-BR and "2.5" in en (FR-015).
 */
export function toErgonomicAnalysisInLocoFormInput(
  data: ErgonomicAnalysisInLocoFormData,
  formatNumber: (value: number) => string
): ErgonomicAnalysisInLocoFormInput {
  return {
    ...data,
    timesPerShift:
      data.timesPerShift === null ? '' : formatNumber(data.timesPerShift),
  }
}

/**
 * The body of `POST`/`PUT /evaluations/ergonomic-analyses-in-loco` (FR-005,
 * FR-008): the date as typed, the shift schedule and the sector trimmed, and
 * the 20 answers in the order of R-7, the texts trimmed keeping their inner
 * line breaks and question 5 as a number; a blank answer goes as `null`, so
 * the `PUT` clears it. Area and fabric are never sent.
 */
export function toErgonomicAnalysisInLocoInput(
  data: ErgonomicAnalysisInLocoFormData
): ErgonomicAnalysisInLocoInput {
  const answers = Object.fromEntries(
    ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.map((key) => [
      key,
      key === ERGONOMIC_ANALYSIS_IN_LOCO_NUMBER_QUESTION
        ? data.timesPerShift
        : data.texts[key]?.trim() || null,
    ])
  ) as ErgonomicAnalysisInLocoInputAnswers

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    date: data.date,
    shift_schedules: data.shift_schedules.trim(),
    sector: data.sector.trim(),
    answers,
  }
}

/**
 * The longest valuer of an Identificação de Riscos, in code points after the
 * trim: the `varchar(255)` of the column (FR-006).
 */
export const MAX_RISK_FACTOR_VALUER_LENGTH = 255

/**
 * Mirrors the API rules of an Identificação de Riscos write (FR-006,
 * FR-018): the activity chosen among the listed ones, a real date, not
 * compared with the periods, the valuer not blank after the trim and of at
 * most 255 code points, the notes not blank and of at most 5,000, and the
 * total required, a number of at least zero typed in the user's `locale`,
 * which it becomes. The 39 marks are independent booleans, none required
 * (R-8, R-9). Area and fabric are shown by the view only: kept as they come,
 * never sent. The API stays the authority, including whether the activity
 * still exists.
 */
export function makeRiskFactorSchema(
  tv: Translate,
  locale: string = defaultLocale
) {
  const requiredText = (requiredMessage: string, max: number) =>
    z
      .string()
      .refine((value) => value.trim().length > 0, { message: requiredMessage })
      .refine((value) => answerLength(value) <= max, {
        message: tv('textTooLong', { max }),
      })

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    date: z.string().refine(isCalendarDay, tv('checklistDateRequired')),
    valuer: requiredText(tv('valuerRequired'), MAX_RISK_FACTOR_VALUER_LENGTH),
    location: z.object({ area: z.string(), fabric: z.string() }),
    marks: z.object(
      shapeOf(RISK_FACTOR_KEYS, z.boolean()) as Record<
        RiskFactorKey,
        z.ZodBoolean
      >
    ),
    notes: requiredText(tv('notesRequired'), MAX_EVALUATION_TEXT_LENGTH),
    total: z.string().transform((value, ctx) => {
      const parsed = parseLocaleDecimal(value, locale)
      if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({ code: 'custom', message: tv('riskFactorTotalInvalid') })
        return z.NEVER
      }
      return parsed
    }),
  })
}

/** The form as its controls hold it: the total as typed. */
export type RiskFactorFormInput = z.input<
  ReturnType<typeof makeRiskFactorSchema>
>
/** The form once valid: the total as a number. */
export type RiskFactorFormData = z.output<
  ReturnType<typeof makeRiskFactorSchema>
>

/**
 * The form data of the definition: what the create starts from, what the
 * stored record becomes and what a valid form sends. The total is `null`
 * only in an empty form, a blank control; once valid it is a number.
 */
export type RiskFactorFormValues = Omit<RiskFactorFormData, 'total'> & {
  total: number | null
}

/** No mark at all: every item of the board unmarked. */
function unmarked(): Record<RiskFactorKey, boolean> {
  return shapeOf(RISK_FACTOR_KEYS, false) as Record<RiskFactorKey, boolean>
}

/** An empty Identificação de Riscos: no field, no mark and no total. */
export function riskFactorFormDefaultValues(): RiskFactorFormValues {
  return {
    activity_id: '',
    date: '',
    valuer: '',
    location: { area: '', fabric: '' },
    marks: unmarked(),
    notes: '',
    total: null,
  }
}

/**
 * A stored Identificação de Riscos as the form holds it, with the current
 * area and fabric of its activity for the view (R-6). Only `true` is a mark:
 * `false` and `null` are unmarked (FR-007).
 */
export function toRiskFactorFormValues(
  record: RiskFactor
): RiskFactorFormValues {
  const answers = record.answers as unknown as Record<string, unknown>

  return {
    activity_id: record.activity.id,
    date: record.date,
    valuer: record.valuer,
    location: { area: record.activity.area, fabric: record.activity.fabric },
    marks: Object.fromEntries(
      RISK_FACTOR_KEYS.map((key) => [key, answers[key] === true])
    ) as Record<RiskFactorKey, boolean>,
    notes: record.notes,
    total: record.total,
  }
}

/**
 * The values of the controls: the total written in the user's number format
 * (`formatNumber`), so "2,5" in pt-BR and "2.5" in en (FR-018).
 */
export function toRiskFactorFormInput(
  data: RiskFactorFormValues,
  formatNumber: (value: number) => string
): RiskFactorFormInput {
  return {
    ...data,
    total: data.total === null ? '' : formatNumber(data.total),
  }
}

/**
 * The body of `POST`/`PUT /evaluations/risk-factors` (FR-010, FR-018): the
 * date as typed, the valuer trimmed, the notes trimmed keeping their inner
 * line breaks, the total as a number, and the 39 marks in the order of the
 * board, `true` for a marked item and `null` for the others, so the database
 * keeps only the marks and the `PUT` clears what was unmarked. Area and
 * fabric are never sent.
 */
export function toRiskFactorInput(data: RiskFactorFormValues): RiskFactorInput {
  // Only a valid form is sent, and the schema never lets a blank total
  // through: a missing one is a bug, not a value to send.
  if (data.total === null) throw new Error('Risk factor total is required.')

  const answers = Object.fromEntries(
    RISK_FACTOR_KEYS.map((key) => [key, data.marks[key] ? true : null])
  ) as RiskFactorInputAnswers

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    date: data.date,
    valuer: data.valuer.trim(),
    notes: data.notes.trim(),
    total: data.total,
    answers,
  }
}

/**
 * Mirrors the API rules of an Análise Ergonômica do Trabalho – Produção write
 * (FR-011, FR-012, FR-025): the activity chosen among the listed ones, a real
 * date, not compared with the periods, every text and every cell optional, of
 * at most 5,000 code points after the trim, and at most 30 rows per table
 * (H-4). The API stays the authority, including whether the activity still
 * exists.
 */
export function makeErgonomicWorkAnalysisAdvancedSchema(tv: Translate) {
  const text = z
    .string()
    .refine((value) => answerLength(value) <= MAX_EVALUATION_TEXT_LENGTH, {
      message: tv('textTooLong', { max: MAX_EVALUATION_TEXT_LENGTH }),
    })
  const rows = <T extends ErgonomicWorkAnalysisAdvancedTable>(table: T) =>
    z
      .array(
        z.object(
          shapeOf(
            ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS[table],
            text
          ) as Record<ErgonomicWorkAnalysisAdvancedColumn<T>, typeof text>
        )
      )
      .max(MAX_EVALUATION_ROWS, {
        message: tv('tooManyRows', { max: MAX_EVALUATION_ROWS }),
      })

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    date: z.string().refine(isCalendarDay, tv('checklistDateRequired')),
    answers: z.object({
      ...(shapeOf(
        ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS,
        text
      ) as Record<ErgonomicWorkAnalysisAdvancedTextAnswer, typeof text>),
      steps: rows('steps'),
      analyzedActivities: rows('analyzedActivities'),
    }),
  })
}

export type ErgonomicWorkAnalysisAdvancedFormInput = z.input<
  ReturnType<typeof makeErgonomicWorkAnalysisAdvancedSchema>
>
export type ErgonomicWorkAnalysisAdvancedFormData = z.output<
  ReturnType<typeof makeErgonomicWorkAnalysisAdvancedSchema>
>

/** A row of a table as the form holds it: one text per column, `''` blank. */
type ErgonomicWorkAnalysisAdvancedFormRow<
  T extends ErgonomicWorkAnalysisAdvancedTable,
> = Record<ErgonomicWorkAnalysisAdvancedColumn<T>, string>

/** A row of a table with every cell blank, as "Adicionar linha" appends. */
function emptyErgonomicWorkAnalysisAdvancedRow<
  T extends ErgonomicWorkAnalysisAdvancedTable,
>(table: T): ErgonomicWorkAnalysisAdvancedFormRow<T> {
  return shapeOf(
    ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS[table],
    ''
  ) as ErgonomicWorkAnalysisAdvancedFormRow<T>
}

/**
 * The stored rows of a table as the form holds them: each cell `''` when
 * blank, and one empty row when there is none, so the form always shows a
 * row (R-17).
 */
function toErgonomicWorkAnalysisAdvancedFormRows<
  T extends ErgonomicWorkAnalysisAdvancedTable,
>(
  table: T,
  stored: readonly object[] | null | undefined
): ErgonomicWorkAnalysisAdvancedFormRow<T>[] {
  if (!stored || stored.length === 0) {
    return [emptyErgonomicWorkAnalysisAdvancedRow(table)]
  }

  return stored.map((row) => {
    const cells = row as Partial<Record<string, string | null>>

    return Object.fromEntries(
      ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS[table].map((column) => [
        column,
        cells[column] ?? '',
      ])
    ) as ErgonomicWorkAnalysisAdvancedFormRow<T>
  })
}

/**
 * The rows of a table as the body sends them (FR-025, R-16): each cell
 * trimmed, keeping its inner line breaks, a blank one as `null`; a row with
 * every cell blank is left out, the others keep their order; and a table
 * without any row left goes as `null`, which the API stores as absent.
 */
function toErgonomicWorkAnalysisAdvancedRowsInput<
  T extends ErgonomicWorkAnalysisAdvancedTable,
>(
  table: T,
  rows: readonly Partial<Record<string, string>>[]
): Record<ErgonomicWorkAnalysisAdvancedColumn<T>, string | null>[] | null {
  const columns = ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS[table]
  const kept = rows
    .map(
      (row) =>
        Object.fromEntries(
          columns.map((column) => [column, row[column]?.trim() || null])
        ) as Record<ErgonomicWorkAnalysisAdvancedColumn<T>, string | null>
    )
    .filter((row) => Object.values(row).some((cell) => cell !== null))

  return kept.length > 0 ? kept : null
}

/**
 * An empty Análise Ergonômica do Trabalho – Produção: no identification, no
 * text and one empty row in each table (R-17).
 */
export function ergonomicWorkAnalysisAdvancedFormDefaultValues(): ErgonomicWorkAnalysisAdvancedFormData {
  return {
    activity_id: '',
    date: '',
    answers: {
      ...(shapeOf(ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS, '') as Record<
        ErgonomicWorkAnalysisAdvancedTextAnswer,
        string
      >),
      steps: [emptyErgonomicWorkAnalysisAdvancedRow('steps')],
      analyzedActivities: [
        emptyErgonomicWorkAnalysisAdvancedRow('analyzedActivities'),
      ],
    },
  }
}

/**
 * A stored Análise Ergonômica do Trabalho – Produção as the form holds it: an
 * absent text (`null`) is a blank text area, and a table without rows (`null`)
 * is one empty row (FR-025).
 */
export function toErgonomicWorkAnalysisAdvancedFormValues(
  record: ErgonomicWorkAnalysisAdvanced
): ErgonomicWorkAnalysisAdvancedFormData {
  return {
    activity_id: record.activity.id,
    date: record.date,
    answers: {
      ...(Object.fromEntries(
        ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS.map((key) => [
          key,
          record.answers[key] ?? '',
        ])
      ) as Record<ErgonomicWorkAnalysisAdvancedTextAnswer, string>),
      steps: toErgonomicWorkAnalysisAdvancedFormRows(
        'steps',
        record.answers.steps
      ),
      analyzedActivities: toErgonomicWorkAnalysisAdvancedFormRows(
        'analyzedActivities',
        record.answers.analyzedActivities
      ),
    },
  }
}

/**
 * The body of `POST`/`PUT /evaluations/ergonomic-work-analyses-advanced`
 * (FR-014, FR-025): the date as typed, every text trimmed keeping its inner
 * line breaks, a blank one as `null`, so the `PUT` clears what was emptied,
 * and the tables without their blank rows. The photo is not here: it goes
 * after, through `PUT …/photo` (D-2).
 */
export function toErgonomicWorkAnalysisAdvancedInput(
  data: ErgonomicWorkAnalysisAdvancedFormData
): ErgonomicWorkAnalysisAdvancedInput {
  const texts = Object.fromEntries(
    ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS.map((key) => [
      key,
      data.answers[key]?.trim() || null,
    ])
  ) as Record<ErgonomicWorkAnalysisAdvancedTextAnswer, string | null>

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    date: data.date,
    answers: {
      ...texts,
      steps: toErgonomicWorkAnalysisAdvancedRowsInput(
        'steps',
        data.answers.steps
      ),
      analyzedActivities: toErgonomicWorkAnalysisAdvancedRowsInput(
        'analyzedActivities',
        data.answers.analyzedActivities
      ),
    },
  }
}

/**
 * Whether a measure read by `parseLocaleDecimal` follows its rule (AETA
 * FR-016), the web's copy of the API's `rules` (FR-001): finite; at least
 * zero unless `signed`; a whole number of at most
 * `ERGONOMIC_WORK_ANALYSIS_MAX_INTEGER` with `integer`; at most `max`.
 */
function isErgonomicWorkAnalysisMeasure(
  value: number,
  rule: ErgonomicWorkAnalysisMeasureRule
) {
  if (!Number.isFinite(value)) return false
  if (!rule.signed && value < 0) return false
  if (
    rule.integer &&
    (!Number.isInteger(value) || value > ERGONOMIC_WORK_ANALYSIS_MAX_INTEGER)
  ) {
    return false
  }
  return rule.max === undefined || value <= rule.max
}

/** The message of a measure refused by its rule (FR-016). */
function ergonomicWorkAnalysisMeasureMessage(
  tv: Translate,
  rule: ErgonomicWorkAnalysisMeasureRule
) {
  if (rule.integer) return tv('nonNegativeIntegerInvalid')
  if (rule.signed) return tv('numberInvalid')
  if (rule.max !== undefined) {
    return tv('numberRangeInvalid', { min: 0, max: rule.max })
  }
  return tv('nonNegativeNumberInvalid')
}

/**
 * Mirrors the API rules of an Análise Ergonômica do Trabalho – Escritório
 * write (FR-004, FR-006, FR-016): the activity chosen among the listed ones,
 * a real date, not compared with the periods, every text optional, the
 * sector of at most 255 code points after the trim and the others of at most
 * 5,000, and each of the 5 measures blank or typed in the user's `locale`,
 * read by `parseLocaleDecimal` (with `signed` only for the temperature) and
 * checked by its rule of `ERGONOMIC_WORK_ANALYSIS_MEASURES`, so a refused one
 * is shown in its field and never reaches the API (RK-1). The API stays the
 * authority, including whether the activity still exists.
 */
export function makeErgonomicWorkAnalysisSchema(
  tv: Translate,
  locale: string = defaultLocale
) {
  const textOf = (max: number) =>
    z.string().refine((value) => answerLength(value) <= max, {
      message: tv('textTooLong', { max }),
    })
  const texts = Object.fromEntries(
    ERGONOMIC_WORK_ANALYSIS_TEXT_ANSWERS.map((key) => [
      key,
      textOf(
        key === 'sector'
          ? ERGONOMIC_WORK_ANALYSIS_SECTOR_MAX_LENGTH
          : MAX_EVALUATION_TEXT_LENGTH
      ),
    ])
  ) as Record<ErgonomicWorkAnalysisTextAnswer, ReturnType<typeof textOf>>

  const measureOf = (key: ErgonomicWorkAnalysisMeasure) => {
    const { rule } = ERGONOMIC_WORK_ANALYSIS_MEASURES[key] as {
      rule: ErgonomicWorkAnalysisMeasureRule
    }
    return z.string().transform((value, ctx) => {
      const parsed = parseLocaleDecimal(value, locale, { signed: rule.signed })
      if (parsed === null) return null
      if (!isErgonomicWorkAnalysisMeasure(parsed, rule)) {
        ctx.addIssue({
          code: 'custom',
          message: ergonomicWorkAnalysisMeasureMessage(tv, rule),
        })
        return z.NEVER
      }
      return parsed
    })
  }
  const measures = Object.fromEntries(
    ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS.map((key) => [key, measureOf(key)])
  ) as Record<ErgonomicWorkAnalysisMeasure, ReturnType<typeof measureOf>>

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    date: z.string().refine(isCalendarDay, tv('checklistDateRequired')),
    answers: z.object(texts),
    measures: z.object(measures),
  })
}

/** The form as its controls hold it: the measures as typed. */
export type ErgonomicWorkAnalysisFormInput = z.input<
  ReturnType<typeof makeErgonomicWorkAnalysisSchema>
>
/** The form once valid: each measure a number, or `null` when blank. */
export type ErgonomicWorkAnalysisFormData = z.output<
  ReturnType<typeof makeErgonomicWorkAnalysisSchema>
>

/** An empty Análise Ergonômica do Trabalho – Escritório: no field at all. */
export function ergonomicWorkAnalysisFormDefaultValues(): ErgonomicWorkAnalysisFormData {
  return {
    activity_id: '',
    date: '',
    answers: shapeOf(ERGONOMIC_WORK_ANALYSIS_TEXT_ANSWERS, '') as Record<
      ErgonomicWorkAnalysisTextAnswer,
      string
    >,
    measures: shapeOf(ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS, null) as Record<
      ErgonomicWorkAnalysisMeasure,
      number | null
    >,
  }
}

/**
 * A stored Análise Ergonômica do Trabalho – Escritório as the form holds it:
 * an absent text (`null`) is blank, and a measure is its number or `null`.
 */
export function toErgonomicWorkAnalysisFormValues(
  record: ErgonomicWorkAnalysis
): ErgonomicWorkAnalysisFormData {
  return {
    activity_id: record.activity.id,
    date: record.date,
    answers: Object.fromEntries(
      ERGONOMIC_WORK_ANALYSIS_TEXT_ANSWERS.map((key) => [
        key,
        record.answers[key] ?? '',
      ])
    ) as Record<ErgonomicWorkAnalysisTextAnswer, string>,
    measures: Object.fromEntries(
      ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS.map((key) => {
        const value = record.answers[key]
        return [key, typeof value === 'number' ? value : null]
      })
    ) as Record<ErgonomicWorkAnalysisMeasure, number | null>,
  }
}

/**
 * The values of the controls: each measure written in the user's number
 * format (`formatNumber`), so "-2,5" in pt-BR and "-2.5" in en (FR-016,
 * AC-009), and a blank one `''`.
 */
export function toErgonomicWorkAnalysisFormInput(
  data: ErgonomicWorkAnalysisFormData,
  formatNumber: (value: number) => string
): ErgonomicWorkAnalysisFormInput {
  return {
    ...data,
    measures: Object.fromEntries(
      ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS.map((key) => {
        const value = data.measures[key]
        return [key, value === null ? '' : formatNumber(value)]
      })
    ) as Record<ErgonomicWorkAnalysisMeasure, string>,
  }
}

/**
 * The body of `POST`/`PUT /evaluations/ergonomic-work-analyses` (FR-008,
 * FR-016): the date as typed and the 11 answers in the order of the catalog,
 * each text trimmed keeping its inner line breaks and each measure a number;
 * a blank one goes as `null`, so the `PUT` clears it. The photo is not here:
 * it goes after, through `PUT …/photo`.
 */
export function toErgonomicWorkAnalysisInput(
  data: ErgonomicWorkAnalysisFormData
): ErgonomicWorkAnalysisInput {
  const answers = Object.fromEntries(
    ERGONOMIC_WORK_ANALYSIS_ANSWERS.map((key) => [
      key,
      key in data.measures
        ? data.measures[key as ErgonomicWorkAnalysisMeasure]
        : data.answers[key as ErgonomicWorkAnalysisTextAnswer]?.trim() || null,
    ])
  ) as ErgonomicWorkAnalysisInputAnswers

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    date: data.date,
    answers,
  }
}

/**
 * The longest sector and valuer of a Critério de Prioridade, in code points
 * after the trim: the `varchar(255)` of the columns (FR-006).
 */
export const MAX_PRIORITY_CRITERION_TEXT_LENGTH = 255

/** The largest number of employees: the limit of the `integer` column (H-4). */
export const MAX_PRIORITY_CRITERION_NUMBER_OF_EMPLOYEES = 2147483647

/** `solution1` to `solution5`, in the order of the categories. */
const PRIORITY_CRITERION_SOLUTION_KEYS: readonly PriorityCriterionSolutionKey[] =
  PRIORITY_CRITERION_CATEGORIES.map(({ answer }) => answer)

/** Only digits: no sign, no separator, no decimal ("2,5", "-1", "abc"). */
const DIGITS_ONLY = /^\d+$/

/**
 * Mirrors the API rules of a Critério de Prioridade write (FR-006, FR-019):
 * the activity chosen among the listed ones, a real date, not compared with
 * the periods, the sector and the valuer not blank after the trim and of at
 * most 255 code points, the number of employees typed with digits only, an
 * integer from 0 to 2147483647, each of the 5 questions answered with one of
 * its own points (R-9), and each solution optional, of at most 5,000 code
 * points. The answers stay as their radio groups hold them (the points as a
 * string) and the number as typed: `toPriorityCriterionInput` turns them into
 * numbers. Area and fabric are shown by the view only: kept as they come,
 * never sent. The API stays the authority, including whether the activity
 * still exists.
 */
export function makePriorityCriterionSchema(tv: Translate) {
  const requiredText = (requiredMessage: string) =>
    z
      .string()
      .refine((value) => value.trim().length > 0, { message: requiredMessage })
      .refine(
        (value) => answerLength(value) <= MAX_PRIORITY_CRITERION_TEXT_LENGTH,
        {
          message: tv('textTooLong', {
            max: MAX_PRIORITY_CRITERION_TEXT_LENGTH,
          }),
        }
      )

  const solution = z
    .string()
    .refine((value) => answerLength(value) <= MAX_EVALUATION_TEXT_LENGTH, {
      message: tv('textTooLong', { max: MAX_EVALUATION_TEXT_LENGTH }),
    })

  const questions = Object.fromEntries(
    PRIORITY_CRITERION_QUESTIONS.map((question) => [
      question.field,
      z
        .string()
        .refine(
          (value) =>
            question.options.some(({ points }) => String(points) === value),
          { message: tv('choiceRequired') }
        ),
    ])
  ) as Record<PriorityCriterionQuestionField, z.ZodString>

  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    assessment_date: z
      .string()
      .refine(isCalendarDay, tv('assessmentDateRequired')),
    sector: requiredText(tv('sectorRequired')),
    number_of_employees: z.string().refine(
      (value) => {
        const trimmed = value.trim()
        return (
          DIGITS_ONLY.test(trimmed) &&
          Number(trimmed) <= MAX_PRIORITY_CRITERION_NUMBER_OF_EMPLOYEES
        )
      },
      { message: tv('nonNegativeIntegerInvalid') }
    ),
    responsible: requiredText(tv('valuerRequired')),
    location: z.object({ area: z.string(), fabric: z.string() }),
    ...questions,
    answers: z.object(
      shapeOf(PRIORITY_CRITERION_SOLUTION_KEYS, solution) as Record<
        PriorityCriterionSolutionKey,
        typeof solution
      >
    ),
  })
}

export type PriorityCriterionFormData = z.output<
  ReturnType<typeof makePriorityCriterionSchema>
>

/**
 * An empty Critério de Prioridade: no field, no question answered (a new
 * record starts with no option chosen) and no solution.
 */
export function priorityCriterionFormDefaultValues(): PriorityCriterionFormData {
  return {
    activity_id: '',
    assessment_date: '',
    sector: '',
    number_of_employees: '',
    responsible: '',
    location: { area: '', fabric: '' },
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: '',
    answers: shapeOf(PRIORITY_CRITERION_SOLUTION_KEYS, '') as Record<
      PriorityCriterionSolutionKey,
      string
    >,
  }
}

/**
 * A stored Critério de Prioridade as the form holds it, with the current area
 * and fabric of its activity for the view (R-6): each question's points as
 * the value of its radio, the number of employees as digits, and an absent
 * solution (`null`) as a blank text area.
 */
export function toPriorityCriterionFormValues(
  record: PriorityCriterion
): PriorityCriterionFormData {
  return {
    activity_id: record.activity.id,
    assessment_date: record.assessment_date,
    sector: record.sector,
    number_of_employees: String(record.number_of_employees),
    responsible: record.responsible,
    location: { area: record.activity.area, fabric: record.activity.fabric },
    question1: String(record.question1),
    question2: String(record.question2),
    question3: String(record.question3),
    question4: String(record.question4),
    question5: String(record.question5),
    answers: Object.fromEntries(
      PRIORITY_CRITERION_SOLUTION_KEYS.map((key) => [
        key,
        record.answers[key] ?? '',
      ])
    ) as Record<PriorityCriterionSolutionKey, string>,
  }
}

/**
 * The body of `POST`/`PUT /evaluations/priority-criteria` (FR-011, FR-019):
 * the date as typed, the sector and the valuer trimmed, the number of
 * employees and each question's points as numbers, and the 5 solutions
 * trimmed, keeping their inner line breaks; a blank one goes as `null`, which
 * the API stores as absent, so the `PUT` clears a solution that was emptied.
 * Area and fabric are never sent.
 */
export function toPriorityCriterionInput(
  data: PriorityCriterionFormData
): PriorityCriterionInput {
  const answers = Object.fromEntries(
    PRIORITY_CRITERION_SOLUTION_KEYS.map(
      (key): [PriorityCriterionSolutionKey, string | null] => [
        key,
        data.answers[key]?.trim() || null,
      ]
    )
  ) as PriorityCriterionInputAnswers

  return {
    activity_id: data.activity_id,
    // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
    assessment_date: data.assessment_date,
    sector: data.sector.trim(),
    number_of_employees: Number(data.number_of_employees.trim()),
    responsible: data.responsible.trim(),
    // Only a valid form is sent: each value is one of the question's points,
    // the `enum` of the contract (RK-1).
    question1: Number(data.question1) as PriorityCriterionInput['question1'],
    question2: Number(data.question2) as PriorityCriterionInput['question2'],
    question3: Number(data.question3) as PriorityCriterionInput['question3'],
    question4: Number(data.question4) as PriorityCriterionInput['question4'],
    question5: Number(data.question5) as PriorityCriterionInput['question5'],
    answers,
  }
}
