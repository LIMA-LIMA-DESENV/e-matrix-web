'use client'

import { useTranslations } from 'next-intl'
import { type ComponentProps, useState } from 'react'

import { Input } from './input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>

/** Password field with a show/hide toggle. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const t = useTranslations('common')
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        placeholder="••••••••"
        className={`pr-12 ${className ?? ''}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-outline transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden>
          {visible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}
