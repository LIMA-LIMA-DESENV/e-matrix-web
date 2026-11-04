'use client'

import { useTranslations } from 'next-intl'

import type { ChangeAssessment } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ChangeAssessmentPdfLabels,
  ChangeAssessmentPdfRecord,
} from '@/lib/pdf/change-assessment-pdf'

import { CHANGE_ASSESSMENT_QUESTIONS } from '../components/change-assessment-questions'
import { formatEvaluationActivity } from '../components/listing'
import type { EvaluationPdfAdapter } from './types'

/**
 * The report of an Avaliação de Mudanças / Projetos and its blank form (J5,
 * FR-016, FR-017). `jspdf` and the report module are loaded only on demand
 * (NFR-004).
 */
export const changeAssessmentPdfAdapter: EvaluationPdfAdapter<ChangeAssessment> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const formatDateOnly = useFormatDateOnly()

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

      return async function load() {
        const { buildChangeAssessmentPdf } = await import(
          '@/lib/pdf/change-assessment-pdf'
        )

        return {
          build(changeAssessment) {
            return buildChangeAssessmentPdf({
              record: changeAssessment ? toPdfRecord(changeAssessment) : null,
              labels: labels(),
            })
          },
        }
      }
    },
  }
