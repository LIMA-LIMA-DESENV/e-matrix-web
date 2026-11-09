'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { FunctionalCinesioAssessment } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  FunctionalCinesioAssessmentPdfLabels,
  FunctionalCinesioAssessmentPdfRecord,
} from '@/lib/pdf/functional-cinesio-assessment-pdf'

import {
  ageAtDate,
  FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS,
  FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES,
  FUNCTIONAL_CINESIO_ASSESSMENT_LABELS,
  type FunctionalCinesioAssessmentAnswer,
  type FunctionalCinesioAssessmentLabel,
} from '../components/functional-cinesio-assessment-fields'
import { formatEvaluationActivity } from '../components/listing'
import type { EvaluationPdfAdapter } from './types'

const ANSWER_KEYS = Object.keys(
  FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS
) as FunctionalCinesioAssessmentAnswer[]

/**
 * The report of an Avaliação Cinesiofuncional and its blank form (J5, FR-022,
 * FR-023). The dates and the numbers are formatted in the user's locale, the
 * activity is `código — nome` (H-2) and the age comes from `ageAtDate`, on the date
 * of the assessment. The two figures are fetched on the click and go through
 * `loadPdfPhoto`; one that does not download or decode leaves its place empty, and
 * the PDF is still generated (H-7). `jspdf` and the report module are loaded only on
 * demand (NFR-008).
 */
export const functionalCinesioAssessmentPdfAdapter: EvaluationPdfAdapter<FunctionalCinesioAssessment> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const tf = useTranslations(
        'evaluations.functionalCinesioAssessmentFields'
      )
      const format = useFormatter()
      const formatDateOnly = useFormatDateOnly()

      function labels(): FunctionalCinesioAssessmentPdfLabels {
        return {
          title: t('pdf.functionalCinesioAssessment.title'),
          texts: Object.fromEntries(
            FUNCTIONAL_CINESIO_ASSESSMENT_LABELS.map((label) => [
              label,
              tf(`labels.${label}`),
            ])
          ) as Record<FunctionalCinesioAssessmentLabel, string>,
        }
      }

      function toPdfRecord(
        record: FunctionalCinesioAssessment
      ): FunctionalCinesioAssessmentPdfRecord {
        const age = ageAtDate(record.birth_date, record.assessment_date)

        return {
          code: record.code,
          activity: formatEvaluationActivity(record.activity),
          date: formatDateOnly(record.assessment_date) ?? '',
          evaluated: record.evaluated,
          birthDate: formatDateOnly(record.birth_date) ?? '',
          age: age === null ? null : tf('age', { age }),
          registry: record.registry,
          answers: Object.fromEntries(
            ANSWER_KEYS.map((key) => {
              const value = record.answers[key] ?? null
              return [
                key,
                typeof value === 'number'
                  ? format.number(value, { maximumFractionDigits: 20 })
                  : value,
              ]
            })
          ) as FunctionalCinesioAssessmentPdfRecord['answers'],
        }
      }

      return async function load() {
        const [{ buildFunctionalCinesioAssessmentPdf }, photoModule] =
          await Promise.all([
            import('@/lib/pdf/functional-cinesio-assessment-pdf'),
            import('@/lib/pdf/load-photo'),
          ])
        const { loadPdfPhoto, UNAVAILABLE_PHOTO } = photoModule

        /** A figure only illustrates: it never fails the report (H-7). */
        async function loadFigure(src: string) {
          try {
            const response = await fetch(src)
            return response.ok
              ? await loadPdfPhoto(await response.blob())
              : UNAVAILABLE_PHOTO
          } catch {
            return UNAVAILABLE_PHOTO
          }
        }

        const [posture, scapulae] = await Promise.all([
          loadFigure(FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.posture.src),
          loadFigure(FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES.scapulae.src),
        ])

        return {
          build(record) {
            return buildFunctionalCinesioAssessmentPdf({
              record: record ? toPdfRecord(record) : null,
              labels: labels(),
              figures: { posture, scapulae },
            })
          },
        }
      }
    },
  }
