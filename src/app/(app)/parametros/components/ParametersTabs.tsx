'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ListFeedback, type ListFeedbackMessage } from '@/components/list'
import { Tab, TabList } from '@/components/ui'

import { ResetProgramsAction } from './ResetProgramsAction'

// Legacy "Parâmetros" tabs, in the legacy order: "Atividades" first and the
// tab "/parametros" opens on.
const tabs = [
  { key: 'activities', href: '/parametros/atividades' },
  { key: 'periods', href: '/parametros/periodos' },
] as const

type ParametersTabKey = (typeof tabs)[number]['key']

export function ParametersTabs({ active }: { active: ParametersTabKey }) {
  const t = useTranslations('parameters')
  const router = useRouter()
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabList aria-label={t('tabs.label')}>
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              type="button"
              active={tab.key === active}
              onClick={() => router.push(tab.href)}
            >
              {t(`tabs.${tab.key}`)}
            </Tab>
          ))}
        </TabList>

        {/* Shared by both tabs, as the legacy parameters page had it. */}
        <ResetProgramsAction
          onReset={() =>
            setFeedback({ tone: 'success', text: t('resetPrograms.success') })
          }
        />
      </div>

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />
    </div>
  )
}
