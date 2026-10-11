'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tab, TabList } from '@/components/ui'

// Legacy "Parâmetros" tabs, in the legacy order: "Atividades" first and the
// tab "/parametros" opens on.
const tabs = [
  { key: 'activities', href: '/parametros/atividades' },
  { key: 'periods', href: '/parametros/periodos' },
] as const

type ParametersTabKey = (typeof tabs)[number]['key']

export function ParametersTabs({ active }: { active: ParametersTabKey }) {
  const t = useTranslations('parameters.tabs')
  const router = useRouter()

  return (
    <TabList aria-label={t('label')}>
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          type="button"
          active={tab.key === active}
          onClick={() => router.push(tab.href)}
        >
          {t(tab.key)}
        </Tab>
      ))}
    </TabList>
  )
}
