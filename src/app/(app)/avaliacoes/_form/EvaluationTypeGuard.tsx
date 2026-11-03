'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { ListErrorState } from '@/components/list'
import { type EvaluationType, useEvaluationTypes } from '@/lib/evaluation-types'

import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'

/**
 * Renders a record route of a type only while the API enables that type;
 * otherwise it is the not found page, like the tabs (FR-001), before any
 * request of the record and for every role.
 */
export function EvaluationTypeGuard({
  type,
  children,
}: {
  type: EvaluationType
  children: ReactNode
}) {
  const t = useTranslations('evaluations')
  const { types, isLoaded, isError, refetch } = useEvaluationTypes()

  if (!isLoaded) {
    return isError ? (
      <ListErrorState
        title={t('typesLoadErrorTitle')}
        onRetry={() => void refetch()}
      />
    ) : (
      <EvaluationFormSkeleton />
    )
  }

  if (!types.includes(type)) notFound()

  return children
}

/**
 * A record that could not be read (§12): a 404 of a record deleted
 * meanwhile, or a failed request. Shows why, translated, with retry and the
 * way back to the tab.
 */
export function EvaluationLoadError({
  type,
  description,
  listHref,
  onRetry,
}: {
  type: EvaluationType
  description: string
  listHref: string
  onRetry: () => void
}) {
  const t = useTranslations('evaluations')

  return (
    <div className="space-y-4">
      <ListErrorState
        title={t('form.loadError', { type: t(`types.${type}`) })}
        description={description}
        onRetry={onRetry}
      />
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          arrow_back
        </span>
        {t('form.backToList', { type: t(`types.${type}`) })}
      </Link>
    </div>
  )
}
