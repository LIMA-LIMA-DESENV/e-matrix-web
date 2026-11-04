'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useMemo, useState } from 'react'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslateError } from '@/lib/error-translator'
import type { EvaluationType } from '@/lib/evaluation-types'

import { useEvaluationPdf } from '../components/use-evaluation-pdf'
import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import {
  evaluationFormHref,
  evaluationFormPath,
  evaluationsListHref,
} from './list-href'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

/** `<tab>/[id]` of any evaluation type (FR-010, D-5). */
export function ViewEvaluationPage({ type }: { type: EvaluationType }) {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type={type}>
        <ViewEvaluation key={type} definition={evaluationWebDefinition(type)} />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Shows a record of the type to every role (J2): the type's form, filled
 * and with every control disabled, without "Salvar". The header has the PDF
 * of the record and, for who may edit, "Alterar". The deletion is on the
 * listing only.
 */
function ViewEvaluation({
  definition,
}: {
  definition: EvaluationWebDefinition
}) {
  const t = useTranslations('evaluations')
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdf = useEvaluationPdf(definition, setPdfError)
  const listHref = evaluationsListHref(definition.type, searchParams)

  const detail = definition.useDetail(id, !!id)
  const record = detail.data

  const initialValues = useMemo(
    () => (record ? definition.form.toFormValues(record) : undefined),
    [definition, record]
  )

  // The select only needs the record's own activity, as the detail carries
  // it: the view requests no activity list.
  const activities = useMemo<EvaluationActivityOptionsState>(
    () => ({
      options: record ? [record.activity] : [],
      isLoading: false,
      isError: false,
      onRetry: () => undefined,
    }),
    [record]
  )

  if (detail.isLoading) return <EvaluationFormSkeleton />

  if (!record || !initialValues) {
    return (
      <EvaluationLoadError
        type={definition.type}
        description={translateError(detail.failure)}
        listHref={listHref}
        onRetry={detail.refetch}
      />
    )
  }

  function handleDownloadPdf() {
    if (!record || pdf.isGenerating) return

    setPdfError(null)
    void pdf.downloadPdf(record.id)
  }

  const Form = definition.form.Component

  return (
    <Form
      key={`${definition.type}:${record.id}`}
      readOnly
      code={record.code}
      initialValues={initialValues}
      activities={activities}
      listHref={listHref}
      errorMessage={pdfError}
      headerActions={
        <>
          <Button
            type="button"
            variant="outline"
            color="primary"
            onClick={handleDownloadPdf}
            disabled={pdf.isGenerating}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              picture_as_pdf
            </span>
            {pdf.isGenerating ? t('pdf.generating') : t('pdf.download')}
          </Button>
          {canEdit && (
            <Link
              href={evaluationFormHref(
                evaluationFormPath(definition.type, {
                  id: record.id,
                  edit: true,
                }),
                searchParams
              )}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-sm font-medium text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                edit
              </span>
              {t('actions.edit')}
            </Link>
          )}
        </>
      }
    />
  )
}
