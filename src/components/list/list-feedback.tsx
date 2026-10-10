import { useTranslations } from 'next-intl'
import { tv } from 'tailwind-variants'

const listFeedback = tv({
  base: 'mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-medium',
  variants: {
    tone: {
      success: 'border-primary/15 bg-primary/5 text-primary',
      error: 'border-error/20 bg-error/5 text-error',
    },
  },
  defaultVariants: {
    tone: 'success',
  },
})

export interface ListFeedbackMessage {
  tone: 'success' | 'error'
  text: string
}

interface ListFeedbackProps {
  message: ListFeedbackMessage | null
  onDismiss: () => void
}

/**
 * Inline success/error strip shown after a row action.
 */
export function ListFeedback({ message, onDismiss }: ListFeedbackProps) {
  const t = useTranslations('common')

  // The live region stays mounted so screen readers announce new messages.
  return (
    <div role="status">
      {message && (
        <div className={listFeedback({ tone: message.tone })}>
          <span>{message.text}</span>
          <button
            type="button"
            aria-label={t('closeMessage')}
            onClick={onDismiss}
            className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              close
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
