'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

interface AccountMenuProps {
  className?: string
  /** Appearance of each part, set by the shell that renders the menu. */
  classNames: {
    trigger: string
    name: string
    chevron: string
    initials: string
    signOut: string
  }
}

function getUserInitials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Account menu ("Alterar senha"), user initials and sign out, shared by the shells. */
export function AccountMenu({ className, classNames }: AccountMenuProps) {
  const t = useTranslations('nav')
  const router = useRouter()
  const { user, signOut } = useAuth()

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('accountMenu')}
          className={classNames.trigger}
        >
          <p className={classNames.name}>{user?.name}</p>
          <span className={classNames.chevron} aria-hidden>
            keyboard_arrow_down
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[200px]">
          <DropdownMenuItem onSelect={() => router.push('/alterar-senha')}>
            <span
              className="material-symbols-outlined mr-2 text-base"
              aria-hidden
            >
              lock
            </span>
            {t('changePassword')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className={classNames.initials}>{getUserInitials(user?.name)}</div>
      <button
        type="button"
        onClick={() => signOut()}
        className={classNames.signOut}
        title={t('signOut')}
        aria-label={t('signOut')}
      >
        <span className="material-symbols-outlined text-xl" aria-hidden>
          logout
        </span>
      </button>
    </div>
  )
}
