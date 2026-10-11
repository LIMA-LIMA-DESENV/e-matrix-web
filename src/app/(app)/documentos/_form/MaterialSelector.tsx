import { useTranslations } from 'next-intl'

import { DocumentMaterial } from '@/http/api'
import { cn } from '@/lib/utils'

const materials: Array<{ value: DocumentMaterial; icon: string }> = [
  { value: DocumentMaterial['e-social'], icon: 'table_view' },
  { value: DocumentMaterial.docs, icon: 'folder' },
]

interface MaterialSelectorProps {
  value: DocumentMaterial
  onChange: (material: DocumentMaterial) => void
  disabled?: boolean
}

/**
 * Radio cards for the two fixed materials, in the pattern of `RoleSelector`
 * (D-16): two options read better as cards than in a select, and they echo the
 * legacy material cards. There is no `Select` primitive, and creating one for
 * a single consumer would be premature.
 */
export function MaterialSelector({
  value,
  onChange,
  disabled,
}: MaterialSelectorProps) {
  const t = useTranslations('documents.materials')
  const td = useTranslations('documents.form.materialDescription')

  return (
    <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
      {materials.map((material) => {
        const checked = value === material.value

        return (
          <label
            key={material.value}
            className={cn(
              'flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition-colors',
              checked
                ? 'border-primary-container bg-primary-fixed/30'
                : 'border-outline-variant/40 bg-surface-container-low hover:border-outline-variant',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name="material"
              value={material.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(material.value)}
              className="sr-only"
            />
            <span className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <span
                className={cn(
                  'material-symbols-outlined text-xl',
                  checked ? 'text-primary' : 'text-outline'
                )}
                aria-hidden
              >
                {material.icon}
              </span>
              {t(material.value)}
            </span>
            <span className="text-xs text-on-surface-variant">
              {td(material.value)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
