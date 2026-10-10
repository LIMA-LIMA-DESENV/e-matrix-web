import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'

interface ClearFiltersButtonProps {
  onClick: () => void
  className?: string
}

/**
 * Clears search and filters, keeping the sort. Render it only while a search
 * or filter is active.
 */
export function ClearFiltersButton({
  onClick,
  className,
}: ClearFiltersButtonProps) {
  const t = useTranslations('list')

  return (
    <Button
      type="button"
      variant="ghost"
      color="primary"
      onClick={onClick}
      className={className}
    >
      <span className="material-symbols-outlined text-lg" aria-hidden>
        filter_alt_off
      </span>
      {t('clearFilters')}
    </Button>
  )
}
