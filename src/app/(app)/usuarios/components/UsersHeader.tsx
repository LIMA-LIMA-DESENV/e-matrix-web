import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'

interface UsersHeaderProps {
  totalCount: number
  onNewUser: () => void
}

export function UsersHeader({ totalCount, onNewUser }: UsersHeaderProps) {
  const t = useTranslations('users')

  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          {t('eyebrow')}
        </span>
        <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {t('title')}
        </h1>
        <p className="mt-1 font-medium text-on-surface-variant">
          {t('description')}
        </p>
        <p className="mt-3 text-sm text-outline">
          {t('count', { count: totalCount })}
        </p>
      </div>

      <Button
        type="button"
        onClick={onNewUser}
        className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        {t('newUser')}
      </Button>
    </div>
  )
}
