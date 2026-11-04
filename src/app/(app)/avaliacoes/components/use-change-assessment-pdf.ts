'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import {
  type ChangeAssessment,
  getEvaluationsChangeAssessmentsId,
} from '@/http/api'
import { saveBlobAsFile } from '@/lib/download-file'
import { toExportFileName } from '@/lib/export/table'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ChangeAssessmentPdfLabels,
  ChangeAssessmentPdfRecord,
} from '@/lib/pdf/change-assessment-pdf'

import { CHANGE_ASSESSMENT_QUESTIONS } from './change-assessment-questions'
import { formatEvaluationActivity } from './listing'

/** What is being generated: a record id, or `blank` for the blank form. */
type PdfTarget = string

const BLANK: PdfTarget = 'blank'

/** The blank form's file (FR-017). */
const BLANK_FILE_NAME = 'avaliacao-de-mudancas.pdf'

/**
 * Generates in the browser the report of an Avaliação de Mudanças / Projetos
 * and its blank form (J5, FR-016, FR-017), saved as
 * `AMP-1-avaliacao-de-mudancas.pdf` and `avaliacao-de-mudancas.pdf`. The
 * detail is fetched on the click, and `jspdf` and the report module are
 * loaded only then, so none of them is in the bundle of the screen
 * (NFR-004). One PDF is generated at a time; a failure is logged without
 * record data and reported through `onError`, translated (§12).
 */
export function useChangeAssessmentPdf(onError: (message: string) => void) {
  const t = useTranslations('evaluations')
  const formatDateOnly = useFormatDateOnly()
  const [generating, setGenerating] = useState<PdfTarget | null>(null)
  // The row menu has no disabled state, so a second click is dropped here.
  const isBusy = useRef(false)

  function labels(): ChangeAssessmentPdfLabels {
    return {
      title: t('pdf.changeAssessment.title'),
      activity: t('pdf.changeAssessment.activity'),
      date: t('pdf.changeAssessment.date'),
      questions: CHANGE_ASSESSMENT_QUESTIONS.map((key) =>
        t(`pdf.changeAssessment.questions.${key}`)
      ),
    }
  }

  function toPdfRecord(
    changeAssessment: ChangeAssessment
  ): ChangeAssessmentPdfRecord {
    return {
      code: changeAssessment.code,
      activity: formatEvaluationActivity(changeAssessment.activity),
      date: formatDateOnly(changeAssessment.assessment_date) ?? '',
      answers: CHANGE_ASSESSMENT_QUESTIONS.map(
        (key) => changeAssessment.answers[key] ?? ''
      ),
    }
  }

  async function generate(target: PdfTarget, id: string | null) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(target)

    try {
      const [{ buildChangeAssessmentPdf }, response] = await Promise.all([
        import('@/lib/pdf/change-assessment-pdf'),
        id ? getEvaluationsChangeAssessmentsId(id) : null,
      ])

      if (response && response.status !== 200) {
        throw new Error(`Change assessment detail answered ${response.status}.`)
      }

      const record = response ? toPdfRecord(response.data) : null
      const blob = buildChangeAssessmentPdf({ record, labels: labels() })

      saveBlobAsFile(
        blob,
        record
          ? toExportFileName(record.code, 'avaliacao-de-mudancas', 'pdf')
          : BLANK_FILE_NAME
      )
    } catch (error) {
      console.error('Change assessment PDF generation failed.', error)
      onError(t('pdf.error'))
    } finally {
      isBusy.current = false
      setGenerating(null)
    }
  }

  return {
    /** The PDF being generated, if any: a record id or `blank`. */
    generating,
    isGenerating: generating !== null,
    isGeneratingBlank: generating === BLANK,
    downloadPdf: (id: string) => generate(id, id),
    downloadBlankPdf: () => generate(BLANK, null),
  }
}
