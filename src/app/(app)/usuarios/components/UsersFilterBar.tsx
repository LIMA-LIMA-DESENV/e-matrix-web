import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

import { ClearFiltersButton } from '@/components/list'
import { Input } from '@/components/ui'

const filterBar = tv({
  slots: {
    wrapper:
      'mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center',
    searchField: 'relative flex-1',
    icon: 'material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-outline',
    input:
      'border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20',
  },
})

interface UsersFilterBarProps {
  search: string
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onClearFilters: () => void
}

export function UsersFilterBar({
  search,
  hasActiveFilters,
  onSearchChange,
  onClearFilters,
}: UsersFilterBarProps) {
  const t = useTranslations('users')
  const styles = filterBar()

  return (
    <div className={styles.wrapper()}>
      <div className={styles.searchField()}>
        <span className={styles.icon()}>search</span>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className={styles.input()}
          size="lg"
        />
      </div>

      {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
    </div>
  )
}
