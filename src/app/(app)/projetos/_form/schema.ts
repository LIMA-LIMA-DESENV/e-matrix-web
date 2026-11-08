import { z } from 'zod'

import type { Period } from '@/http/api'
import { findPeriodContainingDate } from '@/lib/periods'

/** The varchar(255) texts, `MAX_PROJECT_TEXT_LENGTH` on the server (I-1). */
export const MAX_PROJECT_TEXT_LENGTH = 255

export type Translate = (key: string, values?: Record<string, number>) => string

type PeriodRange = Pick<Period, 'id' | 'start_date' | 'end_date'>

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

/**
 * Length of a value as the API counts it: by code point, so an emoji counts
 * as one, and with every line break as CRLF, because a multipart body sends a
 * text area's `\n` that way (HTML form data rules).
 */
function submittedLength(value: string) {
  return [...value.replace(/\r?\n/g, '\r\n')].length
}

/**
 * A text that is required and of up to 255 characters after trim (FR-004),
 * with the requirement checked before the length.
 */
export function projectText(
  tv: Translate,
  requiredKey: string,
  tooLongKey: string
) {
  return z
    .string()
    .trim()
    .min(1, tv(requiredKey))
    .refine((value) => submittedLength(value) <= MAX_PROJECT_TEXT_LENGTH, {
      message: tv(tooLongKey, { max: MAX_PROJECT_TEXT_LENGTH }),
    })
}

/**
 * A real calendar day **inside one of the given periods**, limits included
 * (FR-005). The periods are the ones the screen already loaded, so a date
 * outside them is refused without a request; a period deleted meanwhile is
 * still caught by the API, under lock, with a translated message.
 */
export function projectDate(tv: Translate, periods: readonly PeriodRange[]) {
  return (
    z
      .string()
      .refine(isCalendarDay, tv('dateRequired'))
      // Only a valid day is checked against the periods, so each date gets
      // the message of its most basic problem.
      .refine(
        (date) =>
          !isCalendarDay(date) || !!findPeriodContainingDate(periods, date),
        tv('dateOutsidePeriods')
      )
  )
}

/**
 * Mirrors the API rules of an RGP/RGA (FR-003 to FR-006): the activity chosen
 * among the listed ones, the date in a period, and the three texts. The scope
 * comes from the route, not from the form. The two photos have their own
 * mirror in `@/lib/file-policy`. The API stays the authority on all of it,
 * including whether the activity still exists.
 */
export function makeImprovementProjectSchema(
  tv: Translate,
  periods: readonly PeriodRange[]
) {
  return z.object({
    activity_id: z.string().min(1, tv('activityRequired')),
    date: projectDate(tv, periods),
    concern: projectText(tv, 'concernRequired', 'concernTooLong'),
    improvement_recommendation: projectText(
      tv,
      'recommendationRequired',
      'recommendationTooLong'
    ),
    priority: projectText(tv, 'priorityRequired', 'priorityTooLong'),
  })
}

export type ImprovementProjectFormData = z.infer<
  ReturnType<typeof makeImprovementProjectSchema>
>

export const improvementProjectFormDefaultValues: ImprovementProjectFormData = {
  activity_id: '',
  date: '',
  concern: '',
  improvement_recommendation: '',
  priority: '',
}

/**
 * Mirrors the API rules of an RA (FR-019), in its order: employee, employee
 * registry, then the date in a period. The receipt form has its own mirror in
 * `file-validation.ts`. The API stays the authority.
 */
export function makeMaterialReceiptSchema(
  tv: Translate,
  periods: readonly PeriodRange[]
) {
  return z.object({
    employee: projectText(tv, 'employeeRequired', 'employeeTooLong'),
    employee_registry: projectText(
      tv,
      'employeeRegistryRequired',
      'employeeRegistryTooLong'
    ),
    date: projectDate(tv, periods),
  })
}

export type MaterialReceiptFormData = z.infer<
  ReturnType<typeof makeMaterialReceiptSchema>
>

export const materialReceiptFormDefaultValues: MaterialReceiptFormData = {
  employee: '',
  employee_registry: '',
  date: '',
}
