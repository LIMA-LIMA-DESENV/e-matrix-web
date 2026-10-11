import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

import { ClearFiltersButton } from '@/components/list'
import { Input } from '@/components/ui'

import { useDocumentMaterialLabel } from './DocumentMaterialBadge'
import { DOCUMENT_MATERIALS } from './listing'

const filterBar = tv({
  slots: {
    wrapper:
      'mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center',
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

interface DocumentsFilterBarProps {
  search: string
  /** Selected material, or `''` for every material. */
  material: string
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onMaterialChange: (value: string) => void
  onClearFilters: () => void
}

export function DocumentsFilterBar({
  search,
  material,
  hasActiveFilters,
  onSearchChange,
  onMaterialChange,
  onClearFilters,
}: DocumentsFilterBarProps) {
  const t = useTranslations('documents')
  const materialLabel = useDocumentMaterialLabel()
  const styles = filterBar()

  function renderChip(value: string, label: string) {
    const isActive = material === value

    return (
      <button
        key={value || 'all'}
        type="button"
        aria-pressed={isActive}
        onClick={() => onMaterialChange(value)}
        className={filterBar({ active: isActive }).chip()}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={styles.wrapper()}>
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

      {/* The legacy material cards, as filter chips over the same table. */}
      <fieldset className={styles.chips()}>
        <legend className="sr-only">{t('materialFilterLabel')}</legend>
        {renderChip('', t('allMaterials'))}
        {DOCUMENT_MATERIALS.map((value) =>
          renderChip(value, materialLabel(value))
        )}
      </fieldset>

      {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
    </div>
  )
}
