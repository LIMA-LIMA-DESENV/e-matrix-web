import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type CopyrightProps = {
  className?: string
}

/**
 * In the classic layout it shows the legacy footer text instead. Both texts
 * are rendered and CSS hides one, so server and client always agree.
 */
export function Copyright({ className }: CopyrightProps) {
  const t = useTranslations('common')

  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-widest text-outline classic:text-xs classic:font-normal classic:normal-case classic:tracking-normal',
        className
      )}
    >
      <span className="classic:hidden">
        {t('copyright', { year: new Date().getFullYear() })}
      </span>
      {/* Same band as the classic shell footer: 4.5:1 over the background image. */}
      <span className="hidden rounded bg-black/60 px-3 py-1 text-[#eeeeee] [text-shadow:1px_1px_5px_black] classic:inline-block">
        {t('classicCopyright')}
        <br />
        {t('allRightsReserved')}
      </span>
    </p>
  )
}
