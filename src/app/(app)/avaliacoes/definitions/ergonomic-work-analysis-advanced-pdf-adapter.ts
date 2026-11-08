'use client'

import { useTranslations } from 'next-intl'

import type { ErgonomicWorkAnalysisAdvanced } from '@/http/api'
import { fetchEvaluationPhoto } from '@/lib/download-file'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  ErgonomicWorkAnalysisAdvancedPdfAnswers,
  ErgonomicWorkAnalysisAdvancedPdfLabels,
  ErgonomicWorkAnalysisAdvancedPdfRecord,
} from '@/lib/pdf/ergonomic-work-analysis-advanced-pdf'
import type { PdfPhoto } from '@/lib/pdf/load-photo'

import {
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA,
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS,
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS,
  type ErgonomicWorkAnalysisAdvancedComplementaryData,
  type ErgonomicWorkAnalysisAdvancedTextAnswer,
} from '../components/ergonomic-work-analysis-advanced-fields'
import { formatEvaluationActivity } from '../components/listing'
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

/**
 * The report of an Análise Ergonômica do Trabalho – Produção and its blank
 * form (J5, FR-026, FR-027). The date is formatted in the user's locale and
 * the activity is `código — nome`, as on the listing. The sector photo is
 * fetched with the record on the click (NFR-007) and goes through
 * `loadPdfPhoto` as JPEG with its EXIF orientation (NFR-008); a photo that
 * does not download or decode becomes "Foto indisponível" in its cell, and
 * the PDF is still generated, as for the Projetos. `jspdf` and the report
 * module are loaded only on demand.
 */
export const ergonomicWorkAnalysisAdvancedPdfAdapter: EvaluationPdfAdapter<ErgonomicWorkAnalysisAdvanced> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const tf = useTranslations('files.photo')
      const formatDateOnly = useFormatDateOnly()

      function labels(): ErgonomicWorkAnalysisAdvancedPdfLabels {
        const prefix = 'pdf.ergonomicWorkAnalysisAdvanced'

        return {
          title: t(`${prefix}.title`),
          activity: t(`${prefix}.activity`),
          date: t(`${prefix}.date`),
          photo: t(`${prefix}.photo`),
          photoUnavailable: tf('unavailable'),
          description: t(`${prefix}.description`),
          tables: {
            steps: {
              title: t(`${prefix}.tables.steps.title`),
              columns: textsOf(
                ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS.steps,
                (column) => t(`${prefix}.tables.steps.columns.${column}`)
              ),
            },
            analyzedActivities: {
              title: t(`${prefix}.tables.analyzedActivities.title`),
              columns: textsOf(
                ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS.analyzedActivities,
                (column) =>
                  t(`${prefix}.tables.analyzedActivities.columns.${column}`)
              ),
            },
          },
          complementaryDataTitle: t(`${prefix}.complementaryData`),
          // The 7 legacy labels are the form's (FR-022).
          complementaryData:
            textsOf<ErgonomicWorkAnalysisAdvancedComplementaryData>(
              ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA,
              (key) => t(`ergonomicWorkAnalysisAdvancedFields.answers.${key}`)
            ),
          resultsAndConclusions: t(`${prefix}.resultsAndConclusions`),
          recomendations: t(`${prefix}.recomendations`),
        }
      }

      function toPdfAnswers(
        record: ErgonomicWorkAnalysisAdvanced
      ): ErgonomicWorkAnalysisAdvancedPdfAnswers {
        const texts = Object.fromEntries(
          ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS.map((key) => [
            key,
            record.answers[key] ?? null,
          ])
        ) as Record<ErgonomicWorkAnalysisAdvancedTextAnswer, string | null>

        return {
          ...texts,
          steps: record.answers.steps ?? [],
          analyzedActivities: record.answers.analyzedActivities ?? [],
        }
      }

      function toPdfRecord(
        record: ErgonomicWorkAnalysisAdvanced,
        photo: PdfPhoto | null
      ): ErgonomicWorkAnalysisAdvancedPdfRecord {
        return {
          code: record.code,
          activity: formatEvaluationActivity(record.activity),
          date: formatDateOnly(record.date) ?? '',
          answers: toPdfAnswers(record),
          photo,
        }
      }

      return async function load() {
        const [{ buildErgonomicWorkAnalysisAdvancedPdf }, photoModule] =
          await Promise.all([
            import('@/lib/pdf/ergonomic-work-analysis-advanced-pdf'),
            import('@/lib/pdf/load-photo'),
          ])
        const { loadPdfPhoto, UNAVAILABLE_PHOTO } = photoModule

        /** The photo of the record, never failing the report (FR-026). */
        async function loadPhoto(
          record: ErgonomicWorkAnalysisAdvanced
        ): Promise<PdfPhoto | null> {
          if (!record.photo) return null
          try {
            const blob = await fetchEvaluationPhoto(record)
            return blob ? await loadPdfPhoto(blob) : UNAVAILABLE_PHOTO
          } catch {
            return UNAVAILABLE_PHOTO
          }
        }

        return {
          async build(record) {
            return buildErgonomicWorkAnalysisAdvancedPdf({
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
