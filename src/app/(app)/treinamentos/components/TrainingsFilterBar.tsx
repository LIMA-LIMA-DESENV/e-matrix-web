import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

import { ClearFiltersButton, PeriodFilter } from '@/components/list'
import { Input } from '@/components/ui'
import type { Period } from '@/http/api'

import { TRAINING_CONTENTS } from './listing'
import { useTrainingContentLabel } from './TrainingContentBadge'

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

interface TrainingsFilterBarProps {
  search: string
  /** Selected content, or `''` for every content. */
  content: string
  /**
   * Registered periods; `null` when there is none, which hides the period
   * filter (the screen shows a notice instead, R-12).
   */
  periods: Period[] | null
  /** Selected period id or `all`. */
  period: string
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onContentChange: (value: string) => void
  onPeriodChange: (value: string) => void
  onClearFilters: () => void
}

export function TrainingsFilterBar({
  search,
  content,
  periods,
  period,
  hasActiveFilters,
  onSearchChange,
  onContentChange,
  onPeriodChange,
  onClearFilters,
}: TrainingsFilterBarProps) {
  const t = useTranslations('trainings')
  const contentLabel = useTrainingContentLabel()
  const styles = filterBar()

  function renderChip(value: string, label: string) {
    const isActive = content === value

    return (
      <button
        key={value || 'all'}
        type="button"
        aria-pressed={isActive}
        onClick={() => onContentChange(value)}
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
        {/* The legacy content cards, as filter chips over the same table. */}
        <fieldset className={styles.chips()}>
          <legend className="sr-only">{t('contentFilterLabel')}</legend>
          {renderChip('', t('allContents'))}
          {TRAINING_CONTENTS.map((value) =>
            renderChip(value, contentLabel(value))
          )}
        </fieldset>

        {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
      </div>
    </div>
  )
}
