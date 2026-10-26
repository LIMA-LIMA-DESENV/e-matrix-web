import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import type { MatrixProjectStatus, MatrixRiskLevel } from '@/http/api'

import type { MatrixColumn } from './columns'
import { MATRIX_EMPTY_FILTER, MATRIX_LIST_VALUES } from './listing'
import { useMatrixValueLabels } from './use-matrix-labels'

const controlClasses =
  'h-8 w-full min-w-28 rounded-md border border-outline-variant/60 bg-surface-container-lowest px-2 text-xs font-medium normal-case tracking-normal text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary'

interface MatrixColumnFilterProps {
  column: MatrixColumn
  /** The filter in the URL; `''` for none. */
  value: string
  onChange: (value: string) => void
}

/**
 * The filter in the header of a column (R-11): a list with "all", each value
 * and "empty" in the three list columns, a "contains" text in the others
 * ("equals" between double quotes).
 */
export function MatrixColumnFilter({
  column,
  value,
  onChange,
}: MatrixColumnFilterProps) {
  const t = useTranslations('matrix')
  const labels = useMatrixValueLabels()
  const label = t('filters.label', { column: t(`columns.${column.key}`) })

  if (column.type === 'text') {
    return (
      <MatrixTextFilter
        value={value}
        onChange={onChange}
        label={label}
        placeholder={t('filters.contains')}
      />
    )
  }

  const valueLabel = (option: string) =>
    column.type === 'risk_level'
      ? labels.riskLevel(option as MatrixRiskLevel)
      : labels.projectStatus(option as MatrixProjectStatus)

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={`${controlClasses} cursor-pointer`}
    >
      <option value="">{t('filters.all')}</option>
      {MATRIX_LIST_VALUES[column.type].map((option) => (
        <option key={option} value={option}>
          {valueLabel(option)}
        </option>
      ))}
      <option value={MATRIX_EMPTY_FILTER}>{t('filters.empty')}</option>
    </select>
  )
}

interface MatrixTextFilterProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
}

/**
 * The input follows local state so typing never waits for the URL, as the
 * search of `useListState`: URL values written here are skipped, anything
 * else ("limpar", a pasted link) is adopted.
 */
function MatrixTextFilter({
  value,
  onChange,
  label,
  placeholder,
}: MatrixTextFilterProps) {
  const [draft, setDraft] = useState(value)
  const pendingValues = useRef<string[]>([])

  useEffect(() => {
    const pending = pendingValues.current
    const index = pending.indexOf(value)

    if (index >= 0) {
      pending.splice(0, index + 1)
      return
    }

    setDraft(value)
  }, [value])

  return (
    <input
      type="search"
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        if (next !== value) pendingValues.current.push(next)
        setDraft(next)
        onChange(next)
      }}
      aria-label={label}
      placeholder={placeholder}
      className={controlClasses}
    />
  )
}
