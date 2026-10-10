import { z } from 'zod'

export const MAX_DESCRIPTION_LENGTH = 255

export type Translate = (key: string, values?: Record<string, number>) => string

// `input type="date"` yields `YYYY-MM-DD` (or '' when empty); the value is sent
// as is, never converted to a Date.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Mirrors the API rules that do not depend on other periods: required fields,
 * description length after trim and at least one day of duration. Description
 * uniqueness and overlaps come from the API.
 */
export function makePeriodSchema(tv: Translate) {
  return z
    .object({
      description: z
        .string()
        .trim()
        .min(1, tv('descriptionRequired'))
        .max(
          MAX_DESCRIPTION_LENGTH,
          tv('descriptionTooLong', { max: MAX_DESCRIPTION_LENGTH })
        ),
      start_date: z.string().regex(DATE_ONLY, tv('startDateRequired')),
      end_date: z.string().regex(DATE_ONLY, tv('endDateRequired')),
    })
    .refine((data) => data.end_date > data.start_date, {
      path: ['end_date'],
      message: tv('tooShort'),
    })
}

export type PeriodFormData = z.infer<ReturnType<typeof makePeriodSchema>>

export const periodFormDefaultValues: PeriodFormData = {
  description: '',
  start_date: '',
  end_date: '',
}
