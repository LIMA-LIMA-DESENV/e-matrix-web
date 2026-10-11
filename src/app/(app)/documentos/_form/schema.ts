import { z } from 'zod'

import { DocumentMaterial } from '@/http/api'

export const MAX_FIELD_LENGTH = 255

export type Translate = (key: string, values?: Record<string, number>) => string

// `input type="date"` yields `YYYY-MM-DD` (or '' when empty); the value is sent
// as is, never converted to a Date.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Mirrors the API rules for the four text fields (FR-002 to FR-005): material
 * between the two fixed values, name and responsible required with up to 255
 * characters after trim, and date as a calendar day. The file has its own
 * mirror in `file-validation.ts`, because it is not a form field the schema
 * can hold. The API stays the authority on all of it.
 */
export function makeDocumentSchema(tv: Translate) {
  const field = (requiredKey: string, tooLongKey: string) =>
    z
      .string()
      .trim()
      .min(1, tv(requiredKey))
      .max(MAX_FIELD_LENGTH, tv(tooLongKey, { max: MAX_FIELD_LENGTH }))

  return z.object({
    material: z.enum(
      [DocumentMaterial['e-social'], DocumentMaterial.docs],
      tv('materialRequired')
    ),
    name: field('nameRequired', 'nameTooLong'),
    responsible: field('responsibleRequired', 'responsibleTooLong'),
    // An impossible calendar day (2026-02-30) never reaches here: the browser
    // date field does not produce one. The real case is the empty value.
    date: z.string().regex(DATE_ONLY, tv('dateRequired')),
  })
}

export type DocumentFormData = z.infer<ReturnType<typeof makeDocumentSchema>>

export const documentFormDefaultValues: DocumentFormData = {
  material: DocumentMaterial['e-social'],
  name: '',
  responsible: '',
  date: '',
}
