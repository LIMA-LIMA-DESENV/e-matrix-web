import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { ClassicLogo } from '@/components/auth/classic-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LayoutSwitcher } from '@/components/layout-switcher'
import { Copyright } from '@/components/ui'

interface AuthCardProps {
  /** Material Symbols icon shown above the title. */
  icon: string
  title: string
  description?: ReactNode
  children: ReactNode
  /** Content under the divider at the bottom of the card. */
  footer?: ReactNode
}

/** Centered card shared by the public password-recovery pages. */
export function AuthCard({
  icon,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  const t = useTranslations('common')

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-surface-container p-4 font-body text-on-surface classic:classic-background">
      <div className="absolute top-4 right-4 flex items-center gap-1 classic:rounded-[3px] classic:bg-white">
        <LanguageSwitcher className="text-on-surface-variant" />
        <LayoutSwitcher className="text-on-surface-variant" />
      </div>

      <div className="w-full max-w-md">
        {/* In the classic layout the tokens already give the legacy login
            panel: white, 3px corners and the double Paper shadow. */}
        <div className="flex flex-col items-center overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-xl md:p-10">
          <Image
            src="/logo.png"
            alt={t('logoAlt')}
            width={56}
            height={56}
            className="mb-8 h-14 w-14 classic:hidden"
          />
          <ClassicLogo className="mb-8" />

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed/40">
              <span
                className="material-symbols-outlined text-3xl text-primary"
                aria-hidden
              >
                {icon}
              </span>
            </div>
            <h1 className="mb-3 font-headline text-2xl font-extrabold tracking-tight text-ematrix-dark">
              {title}
            </h1>
            {description && (
              <p className="max-w-[320px] text-sm leading-relaxed text-on-surface-variant">
                {description}
              </p>
            )}
          </div>

          {children}

          {footer && (
            <div className="mt-8 w-full border-t border-surface-variant pt-6 text-center">
              {footer}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Copyright />
        </div>
      </div>
    </main>
  )
}
