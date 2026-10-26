import { useTranslations } from 'next-intl'
import { useId } from 'react'

import type { Period } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { ALL_PERIODS } from './use-period-slice'

interface PeriodFilterProps {
  /** Every registered period, as `GET /periods` lists them. */
  periods: Period[]
  /** A period id or `all`; `''` while the default is being applied. */
  value: string
  onChange: (value: string) => void
  /**
   * Whether "all periods" is offered (default). The Matrix has no such
   * option: pair `false` with the `isPeriodIdValue` validator.
   */
  includeAll?: boolean
}

/**
 * Period slice of a listing (see `usePeriodSlice`): the registered periods,
 * newest first, plus "all periods". A native select, since `components/ui`
 * has no select primitive and the list of periods has no fixed size.
 */
export function PeriodFilter({
  periods,
  value,
  onChange,
  includeAll = true,
}: PeriodFilterProps) {
  const t = useTranslations('periodFilter')
  const formatDateOnly = useFormatDateOnly()
  const id = useId()

  // `GET /periods` comes oldest first; the recent ones are the likely picks.
  const options = [...periods].sort((a, b) =>
    b.start_date.localeCompare(a.start_date)
  )

  return (
    <div className="flex flex-col gap-1 md:min-w-64">
      <label
        htmlFor={id}
        className="text-[11px] font-extrabold uppercase tracking-wider text-outline"
      >
        {t('label')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 cursor-pointer rounded-lg border-none bg-surface-container-low px-4 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
      >
        {!value && <option value="">{t('resolving')}</option>}
        {options.map((period) => (
          <option key={period.id} value={period.id}>
            {t('option', {
              description: period.description,
              start: formatDateOnly(period.start_date) ?? period.start_date,
              end: formatDateOnly(period.end_date) ?? period.end_date,
            })}
          </option>
        ))}
        {includeAll && <option value={ALL_PERIODS}>{t('all')}</option>}
      </select>
    </div>
  )
}
