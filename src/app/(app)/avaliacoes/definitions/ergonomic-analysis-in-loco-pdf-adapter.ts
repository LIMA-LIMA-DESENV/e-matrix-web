'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { ErgonomicAnalysisInLoco } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ErgonomicAnalysisInLocoPdfLabels,
  ErgonomicAnalysisInLocoPdfRecord,
} from '@/lib/pdf/ergonomic-analysis-in-loco-pdf'

import {
  ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS,
  ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS,
} from '../components/ergonomic-analysis-in-loco-questions'
import { formatEvaluationActivity } from '../components/listing'
import type { EvaluationPdfAdapter } from './types'

/**
 * The report of a Coleta de Dados In Loco — Produção and its blank form (J5,
 * FR-016, FR-017). The date and question 5 are formatted in the user's
 * locale, the activity is `código — nome` as on the listing, and the area and
 * fabric are the current ones of the detail (R-6). `jspdf` and the report
 * module are loaded only on demand (NFR-007).
 */
export const ergonomicAnalysisInLocoPdfAdapter: EvaluationPdfAdapter<ErgonomicAnalysisInLoco> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const format = useFormatter()
      const formatDateOnly = useFormatDateOnly()

      function labels(): ErgonomicAnalysisInLocoPdfLabels {
        return {
          title: t('pdf.ergonomicAnalysisInLoco.title'),
          date: t('pdf.ergonomicAnalysisInLoco.fields.date'),
          shiftSchedules: t(
            'pdf.ergonomicAnalysisInLoco.fields.shiftSchedules'
          ),
          activity: t('pdf.ergonomicAnalysisInLoco.fields.activity'),
          area: t('pdf.ergonomicAnalysisInLoco.fields.area'),
          fabric: t('pdf.ergonomicAnalysisInLoco.fields.fabric'),
          sector: t('pdf.ergonomicAnalysisInLoco.fields.sector'),
          timesAndCycles: t('pdf.ergonomicAnalysisInLoco.timesAndCycles'),
          questions: ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.map((key) =>
            t(`pdf.ergonomicAnalysisInLoco.questions.${key}`)
          ),
          processSteps: ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS.map((key) =>
            t(`pdf.ergonomicAnalysisInLoco.processSteps.${key}`)
          ),
        }
      }

      function answer(value: string | number | null | undefined) {
        if (typeof value === 'number') {
          return format.number(value, { maximumFractionDigits: 20 })
        }
        return value ?? ''
      }

      function toPdfRecord(
        record: ErgonomicAnalysisInLoco
      ): ErgonomicAnalysisInLocoPdfRecord {
        return {
          code: record.code,
          date: formatDateOnly(record.date) ?? '',
          shiftSchedules: record.shift_schedules,
          activity: formatEvaluationActivity(record.activity),
          area: record.activity.area,
          fabric: record.activity.fabric,
          sector: record.sector,
          answers: ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS.map((key) =>
            answer(record.answers[key])
          ),
        }
      }

      return async function load() {
        const { buildErgonomicAnalysisInLocoPdf } = await import(
          '@/lib/pdf/ergonomic-analysis-in-loco-pdf'
        )

        return {
          build(record) {
            return buildErgonomicAnalysisInLocoPdf({
              record: record ? toPdfRecord(record) : null,
              labels: labels(),
            })
          },
        }
      }
    },
  }
