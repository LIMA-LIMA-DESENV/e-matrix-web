import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { ClearFiltersButton, PeriodFilter } from '@/components/list'
import { Input } from '@/components/ui'
import type { Period } from '@/http/api'

import { ColumnPicker } from './ColumnPicker'
import type { MatrixColumnKey } from './columns'

interface MatrixFilterBarProps {
  search: string
  /** Every registered period; the bar is only shown when there is one. */
  periods: Period[]
  /** Selected period id; `''` while the default is being applied. */
  period: string
  visibleKeys: ReadonlySet<MatrixColumnKey>
  filteredKeys: ReadonlySet<MatrixColumnKey>
  /** A search, a column filter or a column choice other than the default. */
  canClear: boolean
  /** "Exportar", only while there is a table to export. */
  exportMenu?: ReactNode
  onSearchChange: (value: string) => void
  onPeriodChange: (value: string) => void
  onToggleColumn: (key: MatrixColumnKey) => void
  onShowAllColumns: () => void
  onClear: () => void
}

/**
 * Search over every column, the period, without "all periods" (R-2), the
 * column picker, "limpar", which goes back to the default columns and drops
 * the search and the column filters, keeping the period (R-10), and the
 * export menu (R-18).
 */
export function MatrixFilterBar({
  search,
  periods,
  period,
  visibleKeys,
  filteredKeys,
  canClear,
  exportMenu,
  onSearchChange,
  onPeriodChange,
  onToggleColumn,
  onShowAllColumns,
  onClear,
}: MatrixFilterBarProps) {
  const t = useTranslations('matrix')

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="relative flex-1">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-outline"
            aria-hidden
          >
            search
          </span>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            className="border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20"
            size="lg"
          />
        </div>

        <PeriodFilter
          periods={periods}
          value={period}
          onChange={onPeriodChange}
          includeAll={false}
        />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <ColumnPicker
          visibleKeys={visibleKeys}
          filteredKeys={filteredKeys}
          onToggle={onToggleColumn}
          onShowAll={onShowAllColumns}
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {canClear && <ClearFiltersButton onClick={onClear} />}
          {exportMenu}
        </div>
      </div>
    </div>
  )
}
