import { z } from 'zod'

export const MAX_FIELD_LENGTH = 255

export type Translate = (key: string, values?: Record<string, number>) => string

/**
 * Mirrors the API rules that do not depend on other activities: the six fields
 * are required and hold between 1 and 255 characters after trim, validated in
 * the order the API uses. Code uniqueness comes from the API.
 */
export function makeActivitySchema(tv: Translate) {
  const field = (requiredKey: string, tooLongKey: string) =>
    z
      .string()
      .trim()
      .min(1, tv(requiredKey))
      .max(MAX_FIELD_LENGTH, tv(tooLongKey, { max: MAX_FIELD_LENGTH }))

  return z.object({
    code: field('codeRequired', 'codeTooLong'),
    name: field('nameRequired', 'nameTooLong'),
    fabric: field('fabricRequired', 'fabricTooLong'),
    line: field('lineRequired', 'lineTooLong'),
    area: field('areaRequired', 'areaTooLong'),
    // `function` is fine as a property; it may not be a variable name, so it is
    // never destructured out of the form data.
    function: field('functionRequired', 'functionTooLong'),
  })
}

export type ActivityFormData = z.infer<ReturnType<typeof makeActivitySchema>>

export const activityFormDefaultValues: ActivityFormData = {
  code: '',
  name: '',
  fabric: '',
  line: '',
  area: '',
  function: '',
}
