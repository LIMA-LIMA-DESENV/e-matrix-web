import { z } from 'zod'

import { ProgramType } from '@/http/api'

/** Question and responsible ceiling, as on the server (FR-003). */
export const MAX_FIELD_LENGTH = 255

/** Description and actions ceiling, as on the server (FR-003, H-2). */
export const MAX_TEXT_LENGTH = 5000

/** The five fronts in the order of the enum, which is the listing order. */
export const PROGRAM_TYPES = Object.values(ProgramType)

export type Translate = (key: string, values?: Record<string, number>) => string

// `input type="date"` yields `YYYY-MM-DD` (or '' when empty); the value is sent
// as is, never converted to a Date.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Only decimal digits, as the API reads the multipart text (FR-006). */
const DIGITS = /^\d+$/

/**
 * A real calendar day in `YYYY-MM-DD`, like the server: `2026-02-30` is
 * refused. Computed in UTC, so no time zone can move the day.
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

/**
 * Length as the API counts it (FR-003): the server normalizes `\r\n` to `\n`
 * before counting, so the CRLF a multipart body sends for each line break
 * counts once, and the count is by code point, so an emoji counts as one.
 */
function codePointLength(value: string) {
  return [...value.replace(/\r\n/g, '\n')].length
}

/**
 * Mirrors the API rules for the seven fields (FR-002 to FR-007): type among
 * the five fronts; question and responsible required with up to 255
 * characters after trim; description and actions required with up to 5.000;
 * target date as a real calendar day, past dates included; completed
 * percentage as digits only, from 0 to 100, so `50.5`, `-1` and `1e2` — all
 * of which `input type="number"` lets through — are refused. The file has its
 * own mirror in `file-validation.ts`. The API stays the authority on all of it.
 */
export function makeProgramSchema(tv: Translate) {
  const text = (max: number, requiredKey: string, tooLongKey: string) =>
    z
      .string()
      .trim()
      .min(1, tv(requiredKey))
      .refine((value) => codePointLength(value) <= max, {
        message: tv(tooLongKey, { max }),
      })

  return z.object({
    // The select starts at '' ("choose a type"), so the field takes any text
    // and only the enum decides what passes.
    type: z.string().pipe(z.enum(PROGRAM_TYPES, tv('typeRequired'))),
    question: text(MAX_FIELD_LENGTH, 'questionRequired', 'questionTooLong'),
    description: text(
      MAX_TEXT_LENGTH,
      'descriptionRequired',
      'descriptionTooLong'
    ),
    actions: text(MAX_TEXT_LENGTH, 'actionsRequired', 'actionsTooLong'),
    responsible: text(
      MAX_FIELD_LENGTH,
      'responsibleRequired',
      'responsibleTooLong'
    ),
    target_date: z.string().refine(isCalendarDay, tv('targetDateRequired')),
    completed_percentage: z
      .string()
      .trim()
      .refine(
        (value) => DIGITS.test(value) && Number(value) <= 100,
        tv('completedPercentageInvalid')
      ),
  })
}

/** What the fields hold; `type` is '' until the user picks one. */
export type ProgramFormValues = z.input<ReturnType<typeof makeProgramSchema>>

/** What the schema hands to `onSubmit`, trimmed and with a real type. */
export type ProgramFormData = z.output<ReturnType<typeof makeProgramSchema>>

export const programFormDefaultValues: ProgramFormValues = {
  type: '',
  question: '',
  description: '',
  actions: '',
  responsible: '',
  target_date: '',
  completed_percentage: '0',
}
