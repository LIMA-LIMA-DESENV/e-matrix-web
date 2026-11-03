'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useMemo, useState } from 'react'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useGetEvaluationsChecklistsId } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { useChecklistPdf } from '../components/use-checklist-pdf'
import { ChecklistForm } from './ChecklistForm'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import {
  evaluationFormHref,
  evaluationFormPath,
  evaluationsListHref,
} from './list-href'
import { type ChecklistFormData, toChecklistFormValues } from './schema'
import type { EvaluationActivityOptionsState } from './use-evaluation-activity-options'

export function ViewChecklistPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="checklist">
        <ViewChecklist />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Shows a Coleta de Dados to every role (J2, FR-014, H-2): the same form, filled and
 * with every control disabled, without "Salvar". The header has the PDF of
 * the record and, for who may edit, "Alterar". The deletion is on the
 * listing only (D-7).
 */
function ViewChecklist() {
  const t = useTranslations('evaluations')
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdf = useChecklistPdf(setPdfError)
  const listHref = evaluationsListHref('checklist', searchParams)

  const detail = useGetEvaluationsChecklistsId(id, { query: { enabled: !!id } })
  const record = detail.data?.status === 200 ? detail.data.data : undefined

  const initialValues = useMemo<ChecklistFormData | undefined>(
    () => (record ? toChecklistFormValues(record) : undefined),
    [record]
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
        type="checklist"
        description={translateError(detail.error ?? detail.data)}
        listHref={listHref}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  function handleDownloadPdf() {
    if (!record || pdf.isGenerating) return

    setPdfError(null)
    void pdf.downloadPdf(record.id)
  }

  return (
    <ChecklistForm
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
                evaluationFormPath('checklist', { id: record.id, edit: true }),
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
