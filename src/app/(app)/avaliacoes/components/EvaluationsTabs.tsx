'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tab, TabList } from '@/components/ui'
import {
  EVALUATION_TYPE_HREFS,
  type EvaluationType,
} from '@/lib/evaluation-types'

interface EvaluationsTabsProps {
  active: EvaluationType
  /** The enabled types, in the API order; only these get a tab (FR-011). */
  types: readonly EvaluationType[]
}

/**
 * Title of the screen and one tab per enabled type, each a route of its own,
 * like the Projetos tabs. Search, sort and page belong to the table of each
 * tab, so switching tabs carries none of them.
 */
export function EvaluationsTabs({ active, types }: EvaluationsTabsProps) {
  const t = useTranslations('evaluations')
  const router = useRouter()

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

      {/* With four long type names the tabs wrap on a narrow screen instead
          of widening the page. */}
      <TabList aria-label={t('tabs.label')} className="max-w-full flex-wrap">
        {types.map((type) => (
          <Tab
            key={type}
            type="button"
            active={type === active}
            onClick={() => router.push(EVALUATION_TYPE_HREFS[type])}
          >
            {t(`tabs.${type}`)}
          </Tab>
        ))}
      </TabList>
    </div>
  )
}
