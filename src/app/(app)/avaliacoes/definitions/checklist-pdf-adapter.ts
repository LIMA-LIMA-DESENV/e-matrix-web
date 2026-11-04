'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { Checklist } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ChecklistPdfBlock,
  ChecklistPdfLabels,
  ChecklistPdfRecord,
} from '@/lib/pdf/checklist-pdf'

import {
  CHECKLIST_BLOCKS,
  checklistAnswerOf,
  formatChecklistPercentage,
} from '../components/checklist-blocks'
import { formatEvaluationActivity } from '../components/listing'
import type { EvaluationPdfAdapter } from './types'

const BANDS = ['excellent', 'good', 'reasonable', 'bad', 'terrible'] as const

/**
 * The report of a Coleta de Dados In Loco and its blank form (J-2, J-3,
 * D-7). `jspdf` and the report module are loaded only on demand (NFR-002).
 * The percentages come from the API score, formatted in the user's language
 * with at most two decimals (FR-016); `null` is blank.
 */
export const checklistPdfAdapter: EvaluationPdfAdapter<Checklist> = {
  usePdfBuilder() {
    const t = useTranslations('evaluations')
    const format = useFormatter()
    const formatDateOnly = useFormatDateOnly()

    /** `60%`, `96,36%` in pt-BR and es, `96.36%` in en; `null` is blank. */
    function percentage(value: number | null | undefined) {
      return formatChecklistPercentage(
        (number, options) => format.number(number, options),
        value
      )
    }

    function labels(): ChecklistPdfLabels {
      return {
        title: t('types.checklist'),
        fields: {
          name: t('pdf.checklist.fields.name'),
          sector: t('pdf.checklist.fields.sector'),
          date: t('pdf.checklist.fields.date'),
          activity: t('pdf.checklist.fields.activity'),
        },
        yes: (points) => t('pdf.checklist.yes', { points }),
        no: (points) => t('pdf.checklist.no', { points }),
        pointsSum: t('pdf.checklist.pointsSum'),
        percentage: t('pdf.checklist.percentage'),
        legendTitle: t('pdf.checklist.legendTitle'),
        bands: BANDS.map((band) => ({
          range: t(`pdf.checklist.bands.${band}.range`),
          label: t(`pdf.checklist.bands.${band}.label`),
        })),
        globalClassification: t('pdf.checklist.globalClassification'),
      }
    }

    /**
     * The blocks with their translated questions and, for a record, the
     * marked answer, the point of each question and the block's score.
     */
    function blocks(checklist: Checklist | null): ChecklistPdfBlock[] {
      return CHECKLIST_BLOCKS.map(({ block, questions, expectedNo }) => {
        const score = checklist?.score.blocks.find(
          (item) => item.block === block
        )

        return {
          title: t(`pdf.checklist.blocks.${block}`),
          questions: questions.map((n) => {
            const expected = !(expectedNo as readonly number[]).includes(n)
            const answer = checklist
              ? checklistAnswerOf(checklist.answers, n)
              : null

            return {
              number: n,
              text: t(`pdf.checklist.questions.question${n}`),
              expected,
              answer,
            }
          }),
          sum: score ? String(score.sum) : '',
          percentage: percentage(score?.percentage),
        }
      })
    }

    function toPdfRecord(checklist: Checklist): ChecklistPdfRecord {
      return {
        code: checklist.code,
        name: checklist.name,
        sector: checklist.sector,
        date: formatDateOnly(checklist.date) ?? '',
        activity: formatEvaluationActivity(checklist.activity),
        average: percentage(checklist.score.average),
      }
    }

    return async function load() {
      const { buildChecklistPdf } = await import('@/lib/pdf/checklist-pdf')

      return {
        build(checklist) {
          return buildChecklistPdf({
            record: checklist ? toPdfRecord(checklist) : null,
            blocks: blocks(checklist),
            labels: labels(),
          })
        },
      }
    }
  },
}
