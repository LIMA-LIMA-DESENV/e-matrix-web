'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import {
  getEvaluationsHitListsId,
  type HitList,
  type HitListAnswers,
} from '@/http/api'
import { saveBlobAsFile } from '@/lib/download-file'
import { toExportFileName } from '@/lib/export/table'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  HitListPdfImages,
  HitListPdfLabels,
  HitListPdfRecord,
} from '@/lib/pdf/hit-list-pdf'
import type { PdfPhoto } from '@/lib/pdf/load-photo'

import { formatEvaluationActivity } from './listing'

/**
 * The 10 Hit List items, in the order of the legacy report and of the API
 * catalog: the key of their answers, of their image and of their name.
 */
export const HIT_LIST_ITEMS = [
  'washRag',
  'elbowsOut',
  'shoulderHighLow',
  'hungryHead',
  'buttsUp',
  'twistAndShout',
  'horizontalDistance',
  'sitStand',
  'badVibes',
  'contact',
] as const

const REMEMBER_IMAGES = ['remember1', 'remember2', 'remember3'] as const

/** The images copied from the legacy report, served by `public/`. */
const IMAGE_BASE_URL = '/evaluations/hit-list'

const FOUR = [1, 2, 3, 4] as const
const EIGHT = [1, 2, 3, 4, 5, 6, 7, 8] as const
const TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
const ROOT_CAUSE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

/** What is being generated: a record id, or `blank` for the blank form. */
type PdfTarget = string

const BLANK: PdfTarget = 'blank'

/** The blank form's file (H-4). */
const BLANK_FILE_NAME = 'hit-list.pdf'

/** A text answer as the report prints it: an empty field is blank. */
function text(answers: HitListAnswers, key: keyof HitListAnswers) {
  const value = answers[key]
  return typeof value === 'string' ? value : ''
}

/** A yes/no answer: `null` marks neither, like the legacy report. */
function flag(answers: HitListAnswers, key: keyof HitListAnswers) {
  const value = answers[key]
  return typeof value === 'boolean' ? value : null
}

/** The answers of a Hit List as the report prints them (FR-015). */
function toPdfRecord(hitList: HitList, date: string): HitListPdfRecord {
  const { answers } = hitList
  const key = (name: string) => name as keyof HitListAnswers

  return {
    code: hitList.code,
    date,
    activity: formatEvaluationActivity(hitList.activity),
    department: text(answers, 'department'),
    site: text(answers, 'site'),
    turn: text(answers, 'turn'),
    station: text(answers, 'station'),
    product: text(answers, 'product'),
    tasks: EIGHT.map((n) => text(answers, key(`task${n}`))),
    items: HIT_LIST_ITEMS.map((item) => ({
      tasks: FOUR.map((n) => text(answers, key(`${item}Task${n}`))),
      rootCauses: FOUR.map((n) => text(answers, key(`${item}RootCause${n}`))),
    })),
    rootCauses: ROOT_CAUSE_LETTERS.map((letter) =>
      text(answers, key(`rootCauses${letter}`))
    ),
    improvements: TEN.map((n) => {
      const selected = answers[key(`improvement${n}Selected`)]
      const marked: readonly string[] = Array.isArray(selected) ? selected : []

      return {
        text: text(answers, key(`improvement${n}`)),
        items: HIT_LIST_ITEMS.map((item) => marked.includes(item)),
      }
    }),
    isAnotherWorkstationAffected: flag(answers, 'isAnotherWorkstationAffected'),
    anotherWorkstationAffected: text(answers, 'anotherWorkstationAffected'),
    isCreatedOtherProblem: flag(answers, 'isCreatedOtherProblem'),
    createdOtherProblem: text(answers, 'createdOtherProblem'),
    isProblemSolved: flag(answers, 'isProblemSolved'),
    isEngineeringAware: flag(answers, 'isEngineeringAware'),
    engineeringAware: text(answers, 'engineeringAware'),
    documentNeedUpdate: flag(answers, 'documentNeedUpdate'),
    responsibleEngineeringToUpdateDoc: text(
      answers,
      'responsibleEngineeringToUpdateDoc'
    ),
  }
}

/**
 * Generates in the browser the report of a Hit List and its blank form (J-2,
 * J-3, D-7), saved as `HL-3-hit-list.pdf` and `hit-list.pdf` (H-4). The
 * detail is fetched on the click, and `jspdf`, the report module and the 14
 * images are loaded only then, so none of them is in the bundle of the
 * screen (NFR-002). The images go through `loadPdfPhoto`, as JPEG, to keep
 * the PDF small (NFR-003). One PDF is generated at a time; a failure is
 * logged without record data and reported through `onError`, translated.
 */
export function useHitListPdf(onError: (message: string) => void) {
  const t = useTranslations('evaluations')
  const formatDateOnly = useFormatDateOnly()
  const [generating, setGenerating] = useState<PdfTarget | null>(null)
  // The row menu has no disabled state, so a second click is dropped here.
  const isBusy = useRef(false)

  function labels(): HitListPdfLabels {
    return {
      title: t('types.hit_list'),
      step: (n) => t('pdf.hitList.step', { n }),
      date: t('pdf.hitList.date'),
      steps: {
        activity: t('pdf.hitList.steps.activity'),
        tasks: t('pdf.hitList.steps.tasks'),
        items: t('pdf.hitList.steps.items'),
        rootCauses: t('pdf.hitList.steps.rootCauses'),
        improvements: t('pdf.hitList.steps.improvements'),
        feedback: t('pdf.hitList.steps.feedback'),
        engineer: t('pdf.hitList.steps.engineer'),
      },
      fields: {
        activity: t('pdf.hitList.fields.activity'),
        department: t('pdf.hitList.fields.department'),
        site: t('pdf.hitList.fields.site'),
        turn: t('pdf.hitList.fields.turn'),
        station: t('pdf.hitList.fields.station'),
        product: t('pdf.hitList.fields.product'),
      },
      task: t('pdf.hitList.task'),
      rootCause: t('pdf.hitList.rootCause'),
      remember: t('pdf.hitList.remember'),
      rememberItems: [
        t('pdf.hitList.rememberItems.toolTarget'),
        t('pdf.hitList.rememberItems.comfortZone'),
        t('pdf.hitList.rememberItems.static'),
      ],
      hitListItems: t('pdf.hitList.hitListItems'),
      items: HIT_LIST_ITEMS.map((item) => t(`pdf.hitList.items.${item}`)),
      yes: t('pdf.hitList.yes'),
      no: t('pdf.hitList.no'),
      anotherWorkstationAffected: t(
        'pdf.hitList.questions.anotherWorkstationAffected'
      ),
      ifSoWhich: t('pdf.hitList.questions.ifSoWhich'),
      createdOtherProblem: t('pdf.hitList.questions.createdOtherProblem'),
      ifSoExplain: t('pdf.hitList.questions.ifSoExplain'),
      problemSolved: t('pdf.hitList.questions.problemSolved'),
      engineeringAware: t('pdf.hitList.questions.engineeringAware'),
      documentNeedUpdate: t('pdf.hitList.questions.documentNeedUpdate'),
      engineerName: t('pdf.hitList.engineerName'),
    }
  }

  async function generate(target: PdfTarget, id: string | null) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(target)

    try {
      const [{ buildHitListPdf }, { loadPdfPhoto, UNAVAILABLE_PHOTO }] =
        await Promise.all([
          import('@/lib/pdf/hit-list-pdf'),
          import('@/lib/pdf/load-photo'),
        ])

      async function loadImage(name: string): Promise<PdfPhoto> {
        try {
          const response = await fetch(`${IMAGE_BASE_URL}/${name}.png`)
          if (!response.ok) return UNAVAILABLE_PHOTO
          return await loadPdfPhoto(await response.blob())
        } catch {
          return UNAVAILABLE_PHOTO
        }
      }

      const [response, items, remember, itemsHeader] = await Promise.all([
        id ? getEvaluationsHitListsId(id) : null,
        Promise.all(HIT_LIST_ITEMS.map(loadImage)),
        Promise.all(REMEMBER_IMAGES.map(loadImage)),
        loadImage('itens'),
      ])

      if (response && response.status !== 200) {
        throw new Error(`Hit list detail answered ${response.status}.`)
      }

      const record = response
        ? toPdfRecord(
            response.data,
            formatDateOnly(response.data.assessment_date) ?? ''
          )
        : null
      const images: HitListPdfImages = { items, remember, itemsHeader }

      const blob = buildHitListPdf({ record, labels: labels(), images })

      saveBlobAsFile(
        blob,
        record
          ? toExportFileName(record.code, 'hit-list', 'pdf')
          : BLANK_FILE_NAME
      )
    } catch (error) {
      console.error('Hit list PDF generation failed.', error)
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
