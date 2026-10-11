import {
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import { type Document, DocumentMaterial } from '@/http/api'

import type { DocumentFilterKey, DocumentSortKey } from './types'

/** The two fixed materials, in the order of the legacy cards. */
export const DOCUMENT_MATERIALS = [
  DocumentMaterial['e-social'],
  DocumentMaterial.docs,
] as const

// Opens sorted by date, newest first, like `GET /documents` (R-5, D-6). The
// material filter is the first use of `ListStateConfig.filters` (D-17).
export const DOCUMENT_LIST_CONFIG: ListStateConfig<
  DocumentSortKey,
  DocumentFilterKey
> = {
  sortKeys: [
    'material',
    'name',
    'responsible',
    'date',
    'created_at',
    'updated_at',
  ],
  defaultSort: { key: 'date', dir: 'desc' },
  filters: { material: DOCUMENT_MATERIALS },
}

/** Translates a material into the label shown in the interface. */
export type DocumentMaterialLabel = (material: DocumentMaterial) => string

/**
 * Material sorts by its translated label, so the column orders the way the
 * user reads it — and therefore changes with the language, on purpose.
 *
 * `date` is `YYYY-MM-DD`, which sorts as text in calendar order with no time
 * zone involved; `created_at` and `updated_at` are instants.
 */
export function getDocumentSortColumns(
  materialLabel: DocumentMaterialLabel
): SortColumns<Document, DocumentSortKey> {
  return {
    material: {
      type: 'text',
      getValue: (record) => materialLabel(record.material),
    },
    name: { type: 'text', getValue: (record) => record.name },
    responsible: { type: 'text', getValue: (record) => record.responsible },
    date: { type: 'text', getValue: (record) => record.date },
    created_at: { type: 'date', getValue: (record) => record.created_at },
    updated_at: { type: 'date', getValue: (record) => record.updated_at },
  }
}

/**
 * Single search over the material label, the name and the responsible
 * (FR-020), using the same label the material column sorts by.
 */
export function matchesDocumentSearch(
  record: Document,
  search: string,
  materialLabel: DocumentMaterialLabel
) {
  return matchesSearch(search, [
    materialLabel(record.material),
    record.name,
    record.responsible,
  ])
}
