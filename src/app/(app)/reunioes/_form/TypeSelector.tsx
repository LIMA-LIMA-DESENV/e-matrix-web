import type { MeetingType } from '@/http/api'
import { cn } from '@/lib/utils'

import {
  MEETING_TYPE_ICONS,
  MEETING_TYPES,
  useMeetingTypeLabel,
} from '../components'

interface TypeSelectorProps {
  value: MeetingType
  onChange: (type: MeetingType) => void
  disabled?: boolean
}

/**
 * Radio cards for the three fixed types ("Reunião com", R-2), in the pattern
 * of `ContentSelector` in Treinamentos: there is no `Select` primitive, and
 * the cards echo the legacy type cards.
 */
export function TypeSelector({ value, onChange, disabled }: TypeSelectorProps) {
  const typeLabel = useMeetingTypeLabel()

  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
      {MEETING_TYPES.map((type) => {
        const checked = value === type

        return (
          <label
            key={type}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-xl border-2 p-4 transition-colors',
              checked
                ? 'border-primary-container bg-primary-fixed/30'
                : 'border-outline-variant/40 bg-surface-container-low hover:border-outline-variant',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name="type"
              value={type}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            <span
              className={cn(
                'material-symbols-outlined text-xl',
                checked ? 'text-primary' : 'text-outline'
              )}
              aria-hidden
            >
              {MEETING_TYPE_ICONS[type]}
            </span>
            <span className="text-sm font-bold text-on-surface">
              {typeLabel(type)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
