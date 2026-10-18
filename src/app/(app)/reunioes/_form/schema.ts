import { z } from 'zod'

import { MeetingType, type Period } from '@/http/api'
import { findPeriodContainingDate } from '@/lib/periods'

export const MAX_FIELD_LENGTH = 255

/** The subject ceiling, `MAX_MEETING_SUBJECT_LENGTH` on the server (FR-004). */
export const MAX_SUBJECT_LENGTH = 2000

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

/** Length as the API counts it: by code point, so an emoji counts as one. */
function codePointLength(value: string) {
  return [...value].length
}

/**
 * Length of a multi-line value as the API receives it: a multipart body sends
 * every line break as CRLF (HTML form data rules), so a text area's `\n`
 * counts as two characters on the server.
 */
function submittedLength(value: string) {
  return codePointLength(value.replace(/\r?\n/g, '\r\n'))
}

/**
 * Mirrors the API rules for the six fields (FR-002 to FR-007): type among the
 * three fixed values; name, responsible and status required with up to 255
 * characters after trim; subject required with up to 2.000; date as a real
 * calendar day **inside one of the given periods**, limits included (FR-006).
 * The periods are the ones the screen already loaded, so a date outside them
 * is refused without a request; a period deleted meanwhile is still caught by
 * the API, under lock, with a translated message. The two files have their
 * own mirror in `file-validation.ts`. The API stays the authority on all of it.
 */
export function makeMeetingSchema(
  tv: Translate,
  periods: readonly PeriodRange[]
) {
  const text = (max: number, requiredKey: string, tooLongKey: string) =>
    z
      .string()
      .trim()
      .min(1, tv(requiredKey))
      .refine((value) => submittedLength(value) <= max, {
        message: tv(tooLongKey, { max }),
      })

  return z.object({
    type: z.enum(
      [
        MeetingType['comite-ergonomia'],
        MeetingType.projetos,
        MeetingType['diversas-areas'],
      ],
      tv('typeRequired')
    ),
    name: text(MAX_FIELD_LENGTH, 'nameRequired', 'nameTooLong'),
    responsible: text(
      MAX_FIELD_LENGTH,
      'responsibleRequired',
      'responsibleTooLong'
    ),
    date: z
      .string()
      .refine(isCalendarDay, tv('dateRequired'))
      // Only a valid day is checked against the periods, so each date gets
      // the message of its most basic problem (FR-007).
      .refine(
        (date) =>
          !isCalendarDay(date) || !!findPeriodContainingDate(periods, date),
        tv('dateOutsidePeriods')
      ),
    subject: text(MAX_SUBJECT_LENGTH, 'subjectRequired', 'subjectTooLong'),
    status: text(MAX_FIELD_LENGTH, 'statusRequired', 'statusTooLong'),
  })
}

export type MeetingFormData = z.infer<ReturnType<typeof makeMeetingSchema>>

export const meetingFormDefaultValues: MeetingFormData = {
  type: MeetingType['comite-ergonomia'],
  name: '',
  responsible: '',
  date: '',
  subject: '',
  status: '',
}
