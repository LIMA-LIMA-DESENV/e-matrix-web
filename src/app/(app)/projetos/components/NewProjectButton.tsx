import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@/components/ui'

interface NewProjectButtonProps {
  label: string
  onClick: () => void
  /**
   * With no period registered every date is refused (FR-005), so the action
   * stays visible but disabled, with the reason (J4, AC-025).
   */
  disabled?: boolean
  /**
   * Id of a reason shown elsewhere, for buttons side by side that share one
   * (the empty state of Escritório); the button then shows none of its own.
   */
  hintId?: string
  className?: string
}

/**
 * "Novo" of a record type, on its card and on the empty state (FR-032,
 * FR-033). Rendered only for who may edit (FR-040).
 */
export function NewProjectButton({
  label,
  onClick,
  disabled = false,
  hintId: sharedHintId,
  className,
}: NewProjectButtonProps) {
  const t = useTranslations('projects')
  const ownHintId = useId()
  const hintId = sharedHintId ?? ownHintId

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabled ? hintId : undefined}
        className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          add
        </span>
        {label}
      </Button>
      {disabled && !sharedHintId && (
        <p
          id={hintId}
          className="mt-2 text-xs font-medium text-on-surface-variant"
        >
          {t('newDisabledHint')}
        </p>
      )}
    </div>
  )
}
