'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import {
  type Checklist,
  type ChecklistAnswers,
  type ChecklistBlockScore,
  getEvaluationsChecklistsId,
} from '@/http/api'
import { saveBlobAsFile } from '@/lib/download-file'
import { toExportFileName } from '@/lib/export/table'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ChecklistPdfBlock,
  ChecklistPdfLabels,
  ChecklistPdfRecord,
} from '@/lib/pdf/checklist-pdf'

import { formatEvaluationActivity } from './listing'

type ChecklistBlockName = ChecklistBlockScore['block']

/**
 * The 11 blocks of the Coleta de Dados In Loco, in the order of the legacy
 * form and of the API score, with their questions and the ones whose expected
 * answer is "no" (`equal: false` in the legacy `checklist.pdf.twig`, the
 * `ratedValue` of `CheckList::calculate`). The web's single source of the
 * points of each option: the expected answer is worth 1, the other 0.
 */
const CHECKLIST_BLOCKS = [
  { block: 'layout', questions: [1, 2, 3], expectedNo: [3] },
  {
    block: 'physical_environment',
    questions: [4, 5, 6, 7, 8],
    expectedNo: [6, 7, 8],
  },
  { block: 'posture', questions: [9, 10, 11, 12, 13], expectedNo: [12, 13] },
  { block: 'work_organization', questions: [14, 15, 16], expectedNo: [] },
  { block: 'chair', questions: [17, 18, 19, 20, 21, 22, 23], expectedNo: [] },
  {
    block: 'monitor',
    questions: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
    expectedNo: [30, 31, 32, 33, 34],
  },
  {
    block: 'desk',
    questions: [35, 36, 37, 38, 39, 40, 41, 42],
    expectedNo: [],
  },
  { block: 'keyboard', questions: [43, 44], expectedNo: [] },
  { block: 'cabinet_cpu', questions: [45, 46, 47], expectedNo: [45, 46, 47] },
  { block: 'accessories', questions: [48, 49, 50, 51, 52], expectedNo: [] },
  { block: 'laptop', questions: [53, 54, 55], expectedNo: [] },
] as const satisfies readonly {
  block: ChecklistBlockName
  questions: readonly number[]
  expectedNo: readonly number[]
}[]

type QuestionNumber = (typeof CHECKLIST_BLOCKS)[number]['questions'][number]

const BANDS = ['excellent', 'good', 'reasonable', 'bad', 'terrible'] as const

/** What is being generated: a record id, or `blank` for the blank form. */
type PdfTarget = string

const BLANK: PdfTarget = 'blank'

/** The blank form's file (H-4). */
const BLANK_FILE_NAME = 'coleta-de-dados.pdf'

/** A yes/no answer: `null` marks neither option. */
function answerOf(answers: ChecklistAnswers, n: QuestionNumber) {
  const value = answers[`question${n}`]
  return typeof value === 'boolean' ? value : null
}

/**
 * Generates in the browser the report of a Coleta de Dados In Loco and its
 * blank form (J-2, J-3, D-7), saved as `CDIA-1-coleta-de-dados.pdf` and
 * `coleta-de-dados.pdf` (H-4). The detail, with its `score`, is fetched on
 * the click, and `jspdf` and the report module are loaded only then, so none
 * of them is in the bundle of the screen (NFR-002). The percentages come from
 * the API score, formatted in the user's language with at most two decimals
 * (FR-016); `null` is blank. One PDF is generated at a time; a failure is
 * logged without record data and reported through `onError`, translated.
 */
export function useChecklistPdf(onError: (message: string) => void) {
  const t = useTranslations('evaluations')
  const format = useFormatter()
  const formatDateOnly = useFormatDateOnly()
  const [generating, setGenerating] = useState<PdfTarget | null>(null)
  // The row menu has no disabled state, so a second click is dropped here.
  const isBusy = useRef(false)

  /** `60%`, `96,36%` in pt-BR and es, `96.36%` in en; `null` is blank. */
  function percentage(value: number | null | undefined) {
    if (typeof value !== 'number') return ''
    return `${format.number(value, { maximumFractionDigits: 2 })}%`
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
      const score = checklist?.score.blocks.find((item) => item.block === block)

      return {
        title: t(`pdf.checklist.blocks.${block}`),
        questions: questions.map((n) => {
          const expected = !(expectedNo as readonly number[]).includes(n)
          const answer = checklist ? answerOf(checklist.answers, n) : null

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

  async function generate(target: PdfTarget, id: string | null) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(target)

    try {
      const [{ buildChecklistPdf }, response] = await Promise.all([
        import('@/lib/pdf/checklist-pdf'),
        id ? getEvaluationsChecklistsId(id) : null,
      ])

      if (response && response.status !== 200) {
        throw new Error(`Checklist detail answered ${response.status}.`)
      }

      const checklist = response ? response.data : null
      const record = checklist ? toPdfRecord(checklist) : null

      const blob = buildChecklistPdf({
        record,
        blocks: blocks(checklist),
        labels: labels(),
      })

      saveBlobAsFile(
        blob,
        record
          ? toExportFileName(record.code, 'coleta-de-dados', 'pdf')
          : BLANK_FILE_NAME
      )
    } catch (error) {
      console.error('Checklist PDF generation failed.', error)
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
