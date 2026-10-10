import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type CopyrightProps = {
  className?: string
}

export function Copyright({ className }: CopyrightProps) {
  const t = useTranslations('common')

  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-widest text-outline',
        className
      )}
    >
      {t('copyright', { year: new Date().getFullYear() })}
    </p>
  )
}
