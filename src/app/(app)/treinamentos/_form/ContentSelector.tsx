import type { TrainingContent } from '@/http/api'
import { cn } from '@/lib/utils'

import {
  TRAINING_CONTENT_ICONS,
  TRAINING_CONTENTS,
  useTrainingContentLabel,
} from '../components'

interface ContentSelectorProps {
  value: TrainingContent
  onChange: (content: TrainingContent) => void
  disabled?: boolean
}

/**
 * Radio cards for the five fixed contents, in the pattern of
 * `MaterialSelector` and `RoleSelector` (D-16): there is no `Select`
 * primitive, and the cards echo the legacy content cards, which were also the
 * listing filter.
 */
export function ContentSelector({
  value,
  onChange,
  disabled,
}: ContentSelectorProps) {
  const contentLabel = useTrainingContentLabel()

  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TRAINING_CONTENTS.map((content) => {
        const checked = value === content

        return (
          <label
            key={content}
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
              name="content"
              value={content}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(content)}
              className="sr-only"
            />
            <span
              className={cn(
                'material-symbols-outlined text-xl',
                checked ? 'text-primary' : 'text-outline'
              )}
              aria-hidden
            >
              {TRAINING_CONTENT_ICONS[content]}
            </span>
            <span className="text-sm font-bold text-on-surface">
              {contentLabel(content)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
