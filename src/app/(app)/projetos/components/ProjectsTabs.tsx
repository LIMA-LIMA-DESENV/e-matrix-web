'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tab, TabList } from '@/components/ui'

// Legacy "Projetos" tabs, in the legacy order: "Produção" first and the tab
// "/projetos" opens on (FR-031).
const tabs = [
  { key: 'production', href: '/projetos/producao' },
  { key: 'office', href: '/projetos/escritorio' },
] as const

type ProjectsTabKey = (typeof tabs)[number]['key']

/**
 * Title of the screen and its two tabs, each a route of its own (D-13). The
 * period slice is shared: switching tabs keeps `?period=` (J1), and only it,
 * since search, sort and page belong to the table of each tab.
 */
export function ProjectsTabs({ active }: { active: ProjectsTabKey }) {
  const t = useTranslations('projects')
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
