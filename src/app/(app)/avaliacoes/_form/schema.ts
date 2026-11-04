import { z } from 'zod'

import type {
  ChangeAssessment,
  ChangeAssessmentInput,
  Checklist,
  ChecklistAnswersInput,
  ChecklistInput,
  HitList,
  HitListAnswersInput,
  HitListInput,
} from '@/http/api'

import {
  CHANGE_ASSESSMENT_QUESTIONS,
  type ChangeAssessmentQuestion,
} from '../components/change-assessment-questions'
import {
  CHECKLIST_QUESTION_KEYS,
  type ChecklistQuestionKey,
} from '../components/checklist-blocks'
import { HIT_LIST_ITEMS } from '../components/hit-list-items'

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
