'use client'

import { notFound, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { ListErrorState, ListTableSkeleton } from '@/components/list'
import {
  EVALUATION_TYPE_HREFS,
  useEvaluationTypes,
} from '@/lib/evaluation-types'

import { useEvaluationTableColumns } from './components'

/**
 * Avaliações has no page of its own: it opens on the tab of the first enabled
 * type, and with no type enabled it does not exist (FR-011, J-4).
 */
export default function AvaliacoesPage() {
  const t = useTranslations('evaluations')
  const columns = useEvaluationTableColumns()
  const router = useRouter()
  const { types, isLoaded, isError, refetch } = useEvaluationTypes()
  const first = types[0]

  useEffect(() => {
    if (first) router.replace(EVALUATION_TYPE_HREFS[first])
  }, [first, router])

  if (isLoaded && !first) notFound()

  if (!isLoaded && isError) {
    return (
      <ListErrorState
        title={t('typesLoadErrorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  return <ListTableSkeleton columns={columns} />
}
