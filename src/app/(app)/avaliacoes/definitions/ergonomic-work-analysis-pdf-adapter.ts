'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { ErgonomicWorkAnalysis } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ErgonomicWorkAnalysisPdfAnswers,
  ErgonomicWorkAnalysisPdfLabels,
  ErgonomicWorkAnalysisPdfRecord,
} from '@/lib/pdf/ergonomic-work-analysis-pdf'
import type { PdfPhoto } from '@/lib/pdf/load-photo'

import {
  ERGONOMIC_WORK_ANALYSIS_ANSWERS,
  ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS,
  ERGONOMIC_WORK_ANALYSIS_TABLES,
  type ErgonomicWorkAnalysisMeasure,
} from '../components/ergonomic-work-analysis-fields'
import { formatEvaluationActivity } from '../components/listing'
import { ergonomicWorkAnalysisDefinition } from './ergonomic-work-analysis'
import type { EvaluationPdfAdapter } from './types'

/** One text per key, read with `read`. */
function textsOf<K extends string>(
  keys: readonly K[],
  read: (key: K) => string
): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, read(key)])) as Record<
    K,
    string
  >
}

const MEASURES: readonly string[] = ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS

/**
 * The report of an Análise Ergonômica do Trabalho – Escritório and its blank
 * form (J5, FR-019, FR-020). The date is formatted in the user's locale, the
 * activity is `código — nome`, as on the listing, and each measure is written
 * with `useFormatter().number` ("0,5" in pt-BR and es, "0.5" in en), blank
 * when absent. The workstation photo is fetched with
 * `definition.photo.fetch` on the click (NFR-007) and goes through
 * `loadPdfPhoto`; a photo that does not download or decode becomes "Foto
 * indisponível", and the PDF is still generated. `jspdf` and the report
 * module are loaded only on demand (NFR-008).
 */
export const ergonomicWorkAnalysisPdfAdapter: EvaluationPdfAdapter<ErgonomicWorkAnalysis> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const tf = useTranslations('files.photo')
      const format = useFormatter()
      const formatDateOnly = useFormatDateOnly()

      function labels(): ErgonomicWorkAnalysisPdfLabels {
        const prefix = 'pdf.ergonomicWorkAnalysis'
        const fields = 'ergonomicWorkAnalysisFields'

        return {
          title: t(`${prefix}.title`),
          activity: t(`${prefix}.activity`),
          date: t(`${prefix}.date`),
          photo: t(`${prefix}.photo`),
          photoUnavailable: tf('unavailable'),
          tables: {
            workstation: {
              columns: textsOf(
                ERGONOMIC_WORK_ANALYSIS_TABLES.workstation,
                (key) => t(`${prefix}.tables.workstation.columns.${key}`)
              ),
            },
            advancedAnalysis: {
              title: t(`${prefix}.tables.advancedAnalysis.title`),
              columns: textsOf(
                ERGONOMIC_WORK_ANALYSIS_TABLES.advancedAnalysis,
                (key) => t(`${prefix}.tables.advancedAnalysis.columns.${key}`)
              ),
            },
            physicalEnvironment: {
              title: t(`${prefix}.tables.physicalEnvironment.title`),
              columns: textsOf(
                ERGONOMIC_WORK_ANALYSIS_TABLES.physicalEnvironment,
                (key) =>
                  t(`${prefix}.tables.physicalEnvironment.columns.${key}`)
              ),
            },
          },
          units: textsOf<ErgonomicWorkAnalysisMeasure>(
            ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS,
            (key) => t(`${fields}.units.${key}`)
          ),
          references: textsOf<ErgonomicWorkAnalysisMeasure>(
            ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS,
            (key) => t(`${fields}.references.${key}`)
          ),
        }
      }

      function toPdfAnswers(
        record: ErgonomicWorkAnalysis
      ): ErgonomicWorkAnalysisPdfAnswers {
        return Object.fromEntries(
          ERGONOMIC_WORK_ANALYSIS_ANSWERS.map((key) => {
            const value: unknown = record.answers[key]
            if (MEASURES.includes(key)) {
              return [
                key,
                typeof value === 'number'
                  ? format.number(value, { maximumFractionDigits: 20 })
                  : null,
              ]
            }
            return [key, typeof value === 'string' ? value : null]
          })
        ) as ErgonomicWorkAnalysisPdfAnswers
      }

      function toPdfRecord(
        record: ErgonomicWorkAnalysis,
        photo: PdfPhoto | null
      ): ErgonomicWorkAnalysisPdfRecord {
        return {
          code: record.code,
          activity: formatEvaluationActivity(record.activity),
          date: formatDateOnly(record.date) ?? '',
          answers: toPdfAnswers(record),
          photo,
        }
      }

      return async function load() {
        const [{ buildErgonomicWorkAnalysisPdf }, photoModule] =
          await Promise.all([
            import('@/lib/pdf/ergonomic-work-analysis-pdf'),
            import('@/lib/pdf/load-photo'),
          ])
        const { loadPdfPhoto, UNAVAILABLE_PHOTO } = photoModule

        /** The photo of the record, never failing the report (FR-019). */
        async function loadPhoto(
          record: ErgonomicWorkAnalysis
        ): Promise<PdfPhoto | null> {
          if (!record.photo) return null
          try {
            const blob =
              await ergonomicWorkAnalysisDefinition.photo?.fetch(record)
            return blob ? await loadPdfPhoto(blob) : UNAVAILABLE_PHOTO
          } catch {
            return UNAVAILABLE_PHOTO
          }
        }

        return {
          async build(record) {
            return buildErgonomicWorkAnalysisPdf({
              record: record
                ? toPdfRecord(record, await loadPhoto(record))
                : null,
              labels: labels(),
            })
          },
        }
      }
    },
  }
