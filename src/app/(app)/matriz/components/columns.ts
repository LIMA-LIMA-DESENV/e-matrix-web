import type {
  MatrixProjectStatus,
  MatrixRiskLevel,
  MatrixRow,
  MatrixValues,
} from '@/http/api'

type ActivityKey = Exclude<keyof MatrixRow['activity'], 'id'>
type ValueKey = keyof MatrixValues

export type MatrixColumnKey = ActivityKey | ValueKey

/**
 * How a column is shown: free text, or one of the two lists, whose values are
 * stored in English and shown translated (R-8).
 */
export type MatrixColumnType = 'text' | 'risk_level' | 'project_status'

/** The columns with a legacy help text (`matrix.help.*`). */
export type MatrixHelpKey =
  | 'hazard_type'
  | 'body_segment'
  | 'pure_risk_level'
  | 'pure_risk_classification'
  | 'risk_score'
  | 'engineering_controls'
  | 'administrative_controls'
  | 'control_level'
  | 'residual_risk_level'
  | 'residual_risk_classification'
  | 'post_project_risk'

export interface MatrixColumn {
  key: MatrixColumnKey
  /** Where the value comes from in a row: the activity or its 21 values. */
  source: 'activity' | 'values'
  type: MatrixColumnType
  /** Visible by default (R-10); the others wait for the column picker. */
  isDefault: boolean
  help?: MatrixHelpKey
}

function activity(key: ActivityKey, isDefault = true): MatrixColumn {
  return { key, source: 'activity', type: 'text', isDefault }
}

function value(
  key: ValueKey,
  options: {
    type?: MatrixColumnType
    isDefault?: boolean
    help?: MatrixHelpKey
  } = {}
): MatrixColumn {
  return {
    key,
    source: 'values',
    type: options.type ?? 'text',
    isDefault: options.isDefault ?? false,
    help: options.help,
  }
}

/**
 * The 27 columns, in the legacy order (R-7): the six fields of the activity,
 * read-only here, then the 21 fields of the matrix (spec §10). The labels are
 * `matrix.columns.<key>`.
 */
export const MATRIX_COLUMNS: readonly MatrixColumn[] = [
  activity('code'),
  activity('function'),
  activity('name'),
  activity('fabric'),
  activity('line'),
  activity('area'),
  value('hazard_type', { help: 'hazard_type' }),
  value('hazardous_event'),
  value('injuries'),
  value('causes'),
  value('exposure'),
  value('body_segment', { help: 'body_segment' }),
  value('probability'),
  value('severity'),
  value('pure_risk_level', { help: 'pure_risk_level' }),
  value('pure_risk_classification', { help: 'pure_risk_classification' }),
  value('risk_score', {
    type: 'risk_level',
    isDefault: true,
    help: 'risk_score',
  }),
  value('elimination_substitution'),
  value('engineering_controls', { help: 'engineering_controls' }),
  value('administrative_controls', { help: 'administrative_controls' }),
  value('ppe'),
  value('control_level', { help: 'control_level' }),
  value('residual_risk_level', { help: 'residual_risk_level' }),
  value('residual_risk_classification', {
    help: 'residual_risk_classification',
  }),
  value('required_actions'),
  value('project_status', { type: 'project_status', isDefault: true }),
  value('post_project_risk', {
    type: 'risk_level',
    help: 'post_project_risk',
  }),
]

export const MATRIX_COLUMN_KEYS = MATRIX_COLUMNS.map(({ key }) => key)

/** R-10: code, name, fabric, line, area, function, score and status. */
export const DEFAULT_MATRIX_COLUMNS = MATRIX_COLUMNS.filter(
  ({ isDefault }) => isDefault
)

/** The stored value of a column in a row, before any translation. */
export function getMatrixRawValue(row: MatrixRow, column: MatrixColumn) {
  return column.source === 'activity'
    ? row.activity[column.key as ActivityKey]
    : row.values[column.key as ValueKey]
}

/** Translates a list value into the label shown in the interface. */
export interface MatrixValueLabels {
  riskLevel: (value: MatrixRiskLevel) => string
  projectStatus: (value: MatrixProjectStatus) => string
}

/**
 * The value of a column as the user reads it: list values translated, text
 * as stored, `null` when empty. Search and sort use it too, so they follow
 * what is on screen.
 */
export function getMatrixDisplayValue(
  row: MatrixRow,
  column: MatrixColumn,
  labels: MatrixValueLabels
): string | null {
  const raw = getMatrixRawValue(row, column)
  if (raw === null) return null

  if (column.type === 'risk_level') {
    return labels.riskLevel(raw as MatrixRiskLevel)
  }
  if (column.type === 'project_status') {
    return labels.projectStatus(raw as MatrixProjectStatus)
  }
  return raw
}
