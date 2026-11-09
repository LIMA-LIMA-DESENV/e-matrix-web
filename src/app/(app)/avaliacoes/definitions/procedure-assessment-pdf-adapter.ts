'use client'

import { useTranslations } from 'next-intl'

import type { ProcedureAssessment } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ProcedureAssessmentPdfLabels,
  ProcedureAssessmentPdfRecord,
} from '@/lib/pdf/procedure-assessment-pdf'

import { formatEvaluationActivity } from '../components/listing'
import { PROCEDURE_ASSESSMENT_QUESTIONS } from '../components/procedure-assessment-questions'
import type { EvaluationPdfAdapter } from './types'

/**
 * The report of an Avaliação de Risco Ergonômico de Tarefas and its blank form
 * (J5, FR-017, FR-018). The date is formatted in the user's locale, the
 * activity is `código — nome` as on the listing, and the area and fabric are
 * the current ones of the detail (R-6). `jspdf` and the report module are
 * loaded only on demand (NFR-007); a failure shows `evaluations.pdf.error`
 * (§12).
 */
export const procedureAssessmentPdfAdapter: EvaluationPdfAdapter<ProcedureAssessment> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const formatDateOnly = useFormatDateOnly()

      function labels(): ProcedureAssessmentPdfLabels {
        return {
          title: t('pdf.procedureAssessment.title'),
          fields: {
            activity: t('pdf.procedureAssessment.fields.activity'),
            date: t('pdf.procedureAssessment.fields.date'),
            area: t('pdf.procedureAssessment.fields.area'),
            fabric: t('pdf.procedureAssessment.fields.fabric'),
            sector: t('pdf.procedureAssessment.fields.sector'),
            valuer: t('pdf.procedureAssessment.fields.valuer'),
            ratedTurn: t('pdf.procedureAssessment.fields.ratedTurn'),
          },
          columns: {
            number: t('pdf.procedureAssessment.columns.number'),
            question: t('pdf.procedureAssessment.columns.question'),
            answer: t('pdf.procedureAssessment.columns.answer'),
            comments: t('pdf.procedureAssessment.columns.comments'),
          },
          questions: {
            question1: t('procedureAssessmentQuestions.questions.question1'),
            question2: t('procedureAssessmentQuestions.questions.question2'),
            question3: t('procedureAssessmentQuestions.questions.question3'),
            question4: t('procedureAssessmentQuestions.questions.question4'),
            question5: t('procedureAssessmentQuestions.questions.question5'),
          },
          commentLabels: {
            question1Description: t(
              'procedureAssessmentQuestions.comments.question1Description'
            ),
            question2Description: t(
              'procedureAssessmentQuestions.comments.question2Description'
            ),
            question3Description: t(
              'procedureAssessmentQuestions.comments.question3Description'
            ),
            question4Description: t(
              'procedureAssessmentQuestions.comments.question4Description'
            ),
            question5Description: t(
              'procedureAssessmentQuestions.comments.question5Description'
            ),
          },
          options: {
            1: t('procedureAssessmentQuestions.options.yes'),
            0: t('procedureAssessmentQuestions.options.no'),
          },
        }
      }

      function toPdfRecord(
        record: ProcedureAssessment
      ): ProcedureAssessmentPdfRecord {
        return {
          code: record.code,
          activity: formatEvaluationActivity(record.activity),
          date: formatDateOnly(record.assessment_date) ?? '',
          area: record.activity.area,
          fabric: record.activity.fabric,
          sector: record.sector,
          valuer: record.valuer,
          ratedTurn: record.rated_turn,
          answers: Object.fromEntries(
            PROCEDURE_ASSESSMENT_QUESTIONS.map(({ field }) => [
              field,
              record[field],
            ])
          ) as ProcedureAssessmentPdfRecord['answers'],
          comments: Object.fromEntries(
            PROCEDURE_ASSESSMENT_QUESTIONS.map(({ commentKey }) => [
              commentKey,
              record.answers[commentKey],
            ])
          ) as ProcedureAssessmentPdfRecord['comments'],
        }
      }

      return async function load() {
        const { buildProcedureAssessmentPdf } = await import(
          '@/lib/pdf/procedure-assessment-pdf'
        )

        return {
          build(record) {
            return buildProcedureAssessmentPdf({
              record: record ? toPdfRecord(record) : null,
              labels: labels(),
            })
          },
        }
      }
    },
  }
