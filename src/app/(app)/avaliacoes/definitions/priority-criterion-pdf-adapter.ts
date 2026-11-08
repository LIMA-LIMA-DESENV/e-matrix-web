'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { PriorityCriterion } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  PriorityCriterionPdfLabels,
  PriorityCriterionPdfRecord,
} from '@/lib/pdf/priority-criterion-pdf'

import { formatEvaluationActivity } from '../components/listing'
import {
  PRIORITY_CRITERION_BANDS,
  PRIORITY_CRITERION_CATEGORIES,
  PRIORITY_CRITERION_QUESTIONS,
  type PriorityCriterionLevel,
  type PriorityCriterionOptionKey,
  type PriorityCriterionQuestionField,
  type PriorityCriterionSolutionKey,
} from '../components/priority-criterion-questions'
import type { EvaluationPdfAdapter } from './types'

const QUESTION_FIELDS: readonly PriorityCriterionQuestionField[] =
  PRIORITY_CRITERION_QUESTIONS.map(({ field }) => field)

const OPTION_KEYS: readonly PriorityCriterionOptionKey[] = [
  ...new Set(
    PRIORITY_CRITERION_QUESTIONS.flatMap(({ options }) =>
      options.map(({ key }) => key)
    )
  ),
]

const SOLUTION_KEYS: readonly PriorityCriterionSolutionKey[] =
  PRIORITY_CRITERION_CATEGORIES.map(({ answer }) => answer)

const LEVELS: readonly PriorityCriterionLevel[] = PRIORITY_CRITERION_BANDS.map(
  ({ level }) => level
)

/** One value per key, read with `read`. */
function valuesOf<K extends string, V>(
  keys: readonly K[],
  read: (key: K) => V
): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, read(key)])) as Record<K, V>
}

/**
 * The report of a Critério de Prioridade and its blank form (J5, FR-020,
 * FR-021). The date and the number of employees are formatted in the user's
 * locale, the activity is `código — nome` as on the listing, the area and
 * fabric are the current ones of the detail (R-6), and the sum and the
 * priority are the `priority` of the detail, never computed here (D-8).
 * `jspdf` and the report module are loaded only on demand (NFR-007); a
 * failure shows `evaluations.pdf.error` (§12).
 */
export const priorityCriterionPdfAdapter: EvaluationPdfAdapter<PriorityCriterion> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const format = useFormatter()
      const formatDateOnly = useFormatDateOnly()

      function labels(): PriorityCriterionPdfLabels {
        return {
          title: t('pdf.priorityCriterion.title'),
          fields: {
            date: t('pdf.priorityCriterion.fields.date'),
            sector: t('pdf.priorityCriterion.fields.sector'),
            numberOfEmployees: t(
              'pdf.priorityCriterion.fields.numberOfEmployees'
            ),
            activity: t('pdf.priorityCriterion.fields.activity'),
            area: t('pdf.priorityCriterion.fields.area'),
            fabric: t('pdf.priorityCriterion.fields.fabric'),
          },
          questions: valuesOf(QUESTION_FIELDS, (field) =>
            t(`priorityCriterionQuestions.questions.${field}`)
          ),
          options: valuesOf(OPTION_KEYS, (key) =>
            t(`priorityCriterionQuestions.options.${key}`)
          ),
          sum: t('pdf.priorityCriterion.sum'),
          levels: valuesOf(LEVELS, (level) => ({
            priority: t(`priorityCriterionQuestions.levels.${level}.priority`),
            action: t(`priorityCriterionQuestions.levels.${level}.action`),
          })),
          categoriesTitle: t('priorityCriterionQuestions.categoriesTitle'),
          categories: valuesOf(SOLUTION_KEYS, (key) =>
            t(`priorityCriterionQuestions.categories.${key}`)
          ),
          category: t('pdf.priorityCriterion.category'),
          actions: t('pdf.priorityCriterion.actions'),
          valuer: t('pdf.priorityCriterion.valuer'),
          signature: t('pdf.priorityCriterion.signature'),
        }
      }

      function toPdfRecord(
        record: PriorityCriterion
      ): PriorityCriterionPdfRecord {
        return {
          code: record.code,
          date: formatDateOnly(record.assessment_date) ?? '',
          sector: record.sector,
          numberOfEmployees: format.number(record.number_of_employees),
          activity: formatEvaluationActivity(record.activity),
          area: record.activity.area,
          fabric: record.activity.fabric,
          responsible: record.responsible,
          answers: valuesOf(QUESTION_FIELDS, (field) => record[field]),
          priority: {
            sum: record.priority.sum,
            level: record.priority.level,
          },
          solutions: valuesOf(SOLUTION_KEYS, (key) => record.answers[key]),
        }
      }

      return async function load() {
        const { buildPriorityCriterionPdf } = await import(
          '@/lib/pdf/priority-criterion-pdf'
        )

        return {
          build(record) {
            return buildPriorityCriterionPdf({
              record: record ? toPdfRecord(record) : null,
              labels: labels(),
            })
          },
        }
      }
    },
  }
