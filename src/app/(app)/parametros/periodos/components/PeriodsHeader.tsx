import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'

import { ParametersTabs } from '../../components/ParametersTabs'

interface PeriodsHeaderProps {
  totalCount: number
  onNewPeriod: () => void
}

export function PeriodsHeader({ totalCount, onNewPeriod }: PeriodsHeaderProps) {
  const t = useTranslations('periods')
  const tp = useTranslations('parameters')

  return (
    <div className="mb-10 space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          {tp('eyebrow')}
        </span>
        <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {tp('title')}
        </h1>
        <p className="mt-1 font-medium text-on-surface-variant">
          {tp('description')}
        </p>
      </div>

      <ParametersTabs active="periods" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            {t('description')}
          </p>
          <p className="mt-3 text-sm text-outline">
            {t('count', { count: totalCount })}
          </p>
        </div>

        <Button
          type="button"
          onClick={onNewPeriod}
          className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            add
          </span>
          {t('newPeriod')}
        </Button>
      </div>
    </div>
  )
}
