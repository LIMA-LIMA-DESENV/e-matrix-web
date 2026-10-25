'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import type { ImprovementProject, ImprovementProjectScope } from '@/http/api'
import {
  fetchImprovementProjectPhoto,
  type ImprovementProjectPhotoKey,
  saveBlobAsFile,
} from '@/lib/download-file'
import { useFormatDateOnly } from '@/lib/format-date'

import { formatProjectActivity } from './listing'
import { SCOPE_TYPES } from './types'

/** What is being generated: a record id, or `blank` for a blank form. */
type PdfTarget = string

const BLANK: PdfTarget = 'blank'

/**
 * Generates in the browser the PDF of a project register and the blank form
 * of each type (J6, J7, D-12), and saves them as `RGP-12.pdf` and
 * `RGP.pdf`/`RGA.pdf` (H-3). `jspdf` is loaded with `import()` only on the
 * first click, so it stays out of the bundle of the screens (NFR-012). One
 * PDF is generated at a time; `generating` tells the screen which one, so it
 * can disable its buttons. A photo that fails to download or decode becomes
 * "photo unavailable" in its cell; a failure of the PDF itself is logged
 * without record data and reported through `onError`, translated (§12, §14).
 */
export function useImprovementProjectPdf(onError: (message: string) => void) {
  const t = useTranslations('projects')
  const formatDateOnly = useFormatDateOnly()
  const [generating, setGenerating] = useState<PdfTarget | null>(null)
  // The row menu has no disabled state, so a second click is dropped here.
  const isBusy = useRef(false)

  async function generate(
    target: PdfTarget,
    scope: ImprovementProjectScope,
    record: ImprovementProject | null
  ) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(target)

    try {
      const [
        { buildImprovementProjectPdf },
        { loadPdfPhoto, UNAVAILABLE_PHOTO },
      ] = await Promise.all([
        import('@/lib/pdf/improvement-project-pdf'),
        import('@/lib/pdf/load-photo'),
      ])

      async function loadPhoto(
        project: ImprovementProject,
        photo: ImprovementProjectPhotoKey
      ) {
        try {
          const blob = await fetchImprovementProjectPhoto(project, photo)
          return blob ? await loadPdfPhoto(blob) : null
        } catch {
          return UNAVAILABLE_PHOTO
        }
      }

      const [before, after] = record
        ? await Promise.all([
            loadPhoto(record, 'before-photo'),
            loadPhoto(record, 'after-photo'),
          ])
        : [null, null]

      const blob = buildImprovementProjectPdf({
        scope,
        project: record && {
          code: record.code,
          date: formatDateOnly(record.date) ?? '',
          activity: formatProjectActivity(record.activity),
          concern: record.concern,
          improvementRecommendation: record.improvement_recommendation,
          priority: record.priority,
        },
        photos: { before, after },
        labels: {
          titles: {
            production: t(`types.${SCOPE_TYPES.production}`),
            office: t(`types.${SCOPE_TYPES.office}`),
          },
          concern: t('pdf.labels.concern'),
          recommendation: t('pdf.labels.recommendation'),
          date: t('pdf.labels.date'),
          priority: t('pdf.labels.priority'),
          activity: t('pdf.labels.activity'),
          before: t('pdf.labels.before'),
          after: t('pdf.labels.after'),
          ergonomicRisk: t('pdf.labels.ergonomicRisk'),
          photoUnavailable: t('pdf.labels.photoUnavailable'),
        },
      })

      saveBlobAsFile(
        blob,
        `${record ? record.code : SCOPE_TYPES[scope].toUpperCase()}.pdf`
      )
    } catch (error) {
      console.error('Improvement project PDF generation failed.', error)
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
    downloadPdf: (record: ImprovementProject) =>
      generate(record.id, record.scope, record),
    downloadBlankPdf: (scope: ImprovementProjectScope) =>
      generate(BLANK, scope, null),
  }
}
