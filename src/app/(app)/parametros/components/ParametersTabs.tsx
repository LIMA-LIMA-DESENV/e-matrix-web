'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tab, TabList } from '@/components/ui'

// Legacy "Parâmetros" tabs; "Atividades" joins with its own module.
const tabs = [{ key: 'periods', href: '/parametros/periodos' }] as const

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
