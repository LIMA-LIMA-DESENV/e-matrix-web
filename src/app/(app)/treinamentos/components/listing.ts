import {
  isPeriodFilterValue,
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import { type Training, TrainingContent } from '@/http/api'

import type { TrainingFilterKey, TrainingSortKey } from './types'

/** The five fixed contents, in the order of the legacy cards (R-2). */
export const TRAINING_CONTENTS = [
  TrainingContent.producao,
  TrainingContent.escritorios,
  TrainingContent['novos-funcionarios'],
  TrainingContent.basico,
  TrainingContent.avancado,
] as const

// Opens sorted by date, newest first, like `GET /trainings` (R-9, D-8). The
// period filter has no fixed values, so it takes a validator (D-17); whether
// the id still exists is checked by the screen against the loaded periods.
export const TRAINING_LIST_CONFIG: ListStateConfig<
  TrainingSortKey,
  TrainingFilterKey
> = {
  sortKeys: ['content', 'name', 'responsible', 'date', 'status'],
  defaultSort: { key: 'date', dir: 'desc' },
  filters: { content: TRAINING_CONTENTS, period: isPeriodFilterValue },
}

/** Translates a content into the label shown in the interface. */
export type TrainingContentLabel = (content: TrainingContent) => string

/**
 * Content sorts by its translated label, so the column orders the way the
 * user reads it — and therefore changes with the language, on purpose.
 *
 * `date` is `YYYY-MM-DD`, which sorts as text in calendar order with no time
 * zone involved.
 */
export function getTrainingSortColumns(
  contentLabel: TrainingContentLabel
): SortColumns<Training, TrainingSortKey> {
  return {
    content: {
      type: 'text',
      getValue: (record) => contentLabel(record.content),
    },
    name: { type: 'text', getValue: (record) => record.name },
    responsible: { type: 'text', getValue: (record) => record.responsible },
    date: { type: 'text', getValue: (record) => record.date },
    status: { type: 'text', getValue: (record) => record.status },
  }
}

/**
 * Single search over the content label, the name, the responsible and the
 * status (FR-024), using the same label the content column sorts by.
 */
export function matchesTrainingSearch(
  record: Training,
  search: string,
  contentLabel: TrainingContentLabel
) {
  return matchesSearch(search, [
    contentLabel(record.content),
    record.name,
    record.responsible,
    record.status,
  ])
}
