import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

import { ALL_OFFICE_TYPES, OFFICE_TYPES } from './listing'

const typeFilter = tv({
  slots: {
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

interface OfficeTypeFilterProps {
  /** `?type=` as `useListState` parsed it: `rga`, `ra`, `all` or `''`. */
  value: string
  /** Called with `''` for both types, so the URL drops `type`. */
  onChange: (value: string) => void
}

/**
 * The legacy cards of the Escritório tab as filter chips over the same table
 * (R-24), like the material chips of Documentos.
 */
export function OfficeTypeFilter({ value, onChange }: OfficeTypeFilterProps) {
  const t = useTranslations('projects')
  const styles = typeFilter()
  const selected = value === ALL_OFFICE_TYPES ? '' : value

  function renderChip(chipValue: string, label: string) {
    const isActive = selected === chipValue

    return (
      <button
        key={chipValue || ALL_OFFICE_TYPES}
        type="button"
        aria-pressed={isActive}
        onClick={() => onChange(chipValue)}
        className={typeFilter({ active: isActive }).chip()}
      >
        {label}
      </button>
    )
  }

  return (
    <fieldset className={styles.chips()}>
      <legend className="sr-only">{t('office.typeFilterLabel')}</legend>
      {renderChip('', t('office.allTypes'))}
      {OFFICE_TYPES.map((type) => renderChip(type, t(`shortTypes.${type}`)))}
    </fieldset>
  )
}
