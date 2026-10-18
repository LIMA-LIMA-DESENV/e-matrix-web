import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

import { ClearFiltersButton, PeriodFilter } from '@/components/list'
import { Input } from '@/components/ui'
import type { Period } from '@/http/api'

import { MEETING_TYPES } from './listing'
import { useMeetingTypeLabel } from './MeetingTypeBadge'

const filterBar = tv({
  slots: {
    wrapper:
      'mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm',
    row: 'flex flex-col gap-4 md:flex-row md:items-end',
    searchField: 'relative flex-1',
    icon: 'material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-outline',
    input:
      'border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20',
    chips: 'flex flex-wrap items-center gap-2',
    chip: 'inline-flex cursor-pointer items-center rounded-full border px-4 py-2 font-label text-xs font-semibold transition-colors',
  },
  variants: {
    active: {
      true: { chip: 'border-primary bg-primary text-on-primary' },
      false: {
        chip: 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
      },
    },
  },
})

interface MeetingsFilterBarProps {
  search: string
  /** Selected type, or `''` for every type. */
  type: string
  /**
   * Registered periods; `null` when there is none, which hides the period
   * filter (the screen shows a notice instead, R-10).
   */
  periods: Period[] | null
  /** Selected period id or `all`. */
  period: string
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
  onPeriodChange: (value: string) => void
  onClearFilters: () => void
}

export function MeetingsFilterBar({
  search,
  type,
  periods,
  period,
  hasActiveFilters,
  onSearchChange,
  onTypeChange,
  onPeriodChange,
  onClearFilters,
}: MeetingsFilterBarProps) {
  const t = useTranslations('meetings')
  const typeLabel = useMeetingTypeLabel()
  const styles = filterBar()

  function renderChip(value: string, label: string) {
    const isActive = type === value

    return (
      <button
        key={value || 'all'}
        type="button"
        aria-pressed={isActive}
        onClick={() => onTypeChange(value)}
        className={filterBar({ active: isActive }).chip()}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={styles.wrapper()}>
      <div className={styles.row()}>
        <div className={styles.searchField()}>
          <span className={styles.icon()} aria-hidden>
            search
          </span>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            className={styles.input()}
            size="lg"
          />
        </div>

        {periods && (
          <PeriodFilter
            periods={periods}
            value={period}
            onChange={onPeriodChange}
          />
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* The legacy type cards, as filter chips over the same table (D-14). */}
        <fieldset className={styles.chips()}>
          <legend className="sr-only">{t('typeFilterLabel')}</legend>
          {renderChip('', t('allTypes'))}
          {MEETING_TYPES.map((value) => renderChip(value, typeLabel(value)))}
        </fieldset>

        {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
      </div>
    </div>
  )
}
