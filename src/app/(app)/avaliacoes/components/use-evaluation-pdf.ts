'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { saveBlobAsFile } from '@/lib/download-file'
import { toExportFileName } from '@/lib/export/table'

import type { EvaluationWebDefinition } from '../definitions'

/** What is being generated: a record id, or `blank` for the blank form. */
type PdfTarget = string

const BLANK: PdfTarget = 'blank'

/**
 * Generates in the browser the report of a record of a type, or its blank
 * form (FR-011), saved as `<code>-<base>.pdf` or `<base>.pdf`. The detail is
 * fetched on the click, while the type's adapter loads its report module of
 * `src/lib/pdf` on demand, so none of it is in the bundle of the screen. One
 * PDF is generated at a time; a failure is logged without record data and
 * reported through `onError`, translated.
 *
 * The definition must not change while the screen is mounted: its adapter
 * is a hook.
 */
export function useEvaluationPdf(
  definition: EvaluationWebDefinition,
  onError: (message: string) => void
) {
  const t = useTranslations('evaluations')
  const loadBuilder = definition.pdf.usePdfBuilder()
  const [generating, setGenerating] = useState<PdfTarget | null>(null)
  // The row menu has no disabled state, so a second click is dropped here.
  const isBusy = useRef(false)

  async function generate(target: PdfTarget, id: string | null) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(target)

    try {
      const [builder, response] = await Promise.all([
        loadBuilder(),
        id ? definition.getDetail(id) : null,
      ])

      if (response && response.status !== 200) {
        throw new Error(
          `${definition.type} detail answered ${response.status}.`
        )
      }

      const detail = response ? response.data : null
      const blob = await builder.build(detail)

      saveBlobAsFile(
        blob,
        response
          ? toExportFileName(response.data.code, definition.fileBaseName, 'pdf')
          : `${definition.fileBaseName}.pdf`
      )
    } catch (error) {
      console.error(`${definition.type} PDF generation failed.`, error)
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
