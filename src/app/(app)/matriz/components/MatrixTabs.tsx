import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tab, TabList } from '@/components/ui'

// The two legacy tabs; "Resultados" is the one "/matriz" opens on (R-1).
const tabs = [
  { key: 'results', href: '/matriz' },
  { key: 'charts', href: '/matriz/graficos' },
] as const

export type MatrixTabKey = (typeof tabs)[number]['key']

/**
 * Title of the screen and its two tabs, each a route of its own, like
 * `ProjectsTabs` (FR-001, D-2). The period is shared: switching tabs keeps
 * `?period=`, and only it, since search, filters and the view belong to each
 * tab (R-2).
 */
export function MatrixTabs({ active }: { active: MatrixTabKey }) {
  const t = useTranslations('matrix')
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = searchParams.get('period')

  function hrefOf(path: string) {
    return period ? `${path}?${new URLSearchParams({ period })}` : path
  }

  return (
    <div className="mb-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {t('title')}
        </h1>
        <p className="mt-1 font-medium text-on-surface-variant">
          {t('description')}
        </p>
      </div>

      <TabList aria-label={t('tabs.label')}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            type="button"
            active={tab.key === active}
            onClick={() => router.push(hrefOf(tab.href))}
          >
            {t(`tabs.${tab.key}`)}
          </Tab>
        ))}
      </TabList>
    </div>
  )
}
