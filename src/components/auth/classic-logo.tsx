import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

interface ClassicLogoProps {
  className?: string
}

/**
 * Round logo of the legacy login, shown only in the classic layout. It is a
 * CSS background on a hidden element, not an <img>, so the modern layout
 * never downloads it.
 */
export function ClassicLogo({ className }: ClassicLogoProps) {
  const t = useTranslations('common')

  return (
    <span
      role="img"
      aria-label={t('logoAlt')}
      className={cn(
        'hidden size-[100px] bg-[url(/classic/ergomatrix-circle.png)] bg-cover classic:block',
        className
      )}
    />
  )
}
