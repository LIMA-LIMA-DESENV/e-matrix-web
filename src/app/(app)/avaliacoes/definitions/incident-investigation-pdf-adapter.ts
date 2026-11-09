'use client'

import { useTranslations } from 'next-intl'

import type { IncidentInvestigation } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  IncidentInvestigationPdfLabels,
  IncidentInvestigationPdfRecord,
} from '@/lib/pdf/incident-investigation-pdf'
import type { PdfPhoto } from '@/lib/pdf/load-photo'

import {
  INCIDENT_INVESTIGATION_RISK_FACTORS,
  type IncidentInvestigationRiskFactor,
} from '../components/incident-investigation-fields'
import { formatEvaluationActivity } from '../components/listing'
import { incidentInvestigationDefinition } from './incident-investigation'
import type { EvaluationPdfAdapter } from './types'

/**
 * The report of an Avaliação de Incidente / Acidente and its blank form (J5,
 * FR-016, FR-017). The date is formatted in the user's locale and the activity
 * is `código — nome`, as on the listing (H-3). The photo is fetched with
 * `definition.photo.fetch` on the click (NFR-007) and goes through
 * `loadPdfPhoto`; a photo that does not download or decode becomes "Foto
 * indisponível", and the PDF is still generated. `jspdf` and the report module
 * are loaded only on demand (NFR-007).
 */
export const incidentInvestigationPdfAdapter: EvaluationPdfAdapter<IncidentInvestigation> =
  {
    usePdfBuilder() {
      const t = useTranslations('evaluations')
      const tf = useTranslations('files.photo')
      const formatDateOnly = useFormatDateOnly()

      function labels(): IncidentInvestigationPdfLabels {
        const prefix = 'pdf.incidentInvestigation'

        return {
          title: t(`${prefix}.title`),
          fields: {
            date: t(`${prefix}.fields.date`),
            activity: t(`${prefix}.fields.activity`),
            sector: t(`${prefix}.fields.sector`),
            employee: t(`${prefix}.fields.employee`),
            description: t(`${prefix}.fields.description`),
            ergonomicRiskFactors: t(`${prefix}.fields.ergonomicRiskFactors`),
            comments: t(`${prefix}.fields.comments`),
            image: t(`${prefix}.fields.image`),
          },
          riskFactors: Object.fromEntries(
            INCIDENT_INVESTIGATION_RISK_FACTORS.map((factor) => [
              factor,
              t(`incidentInvestigationFields.riskFactors.${factor}`),
            ])
          ) as Record<IncidentInvestigationRiskFactor, string>,
          photoUnavailable: tf('unavailable'),
        }
      }

      function toPdfRecord(
        record: IncidentInvestigation,
        photo: PdfPhoto | null
      ): IncidentInvestigationPdfRecord {
        return {
          code: record.code,
          activity: formatEvaluationActivity(record.activity),
          date: formatDateOnly(record.investigation_date) ?? '',
          description: record.description,
          answers: {
            sector: record.answers.sector ?? null,
            employee: record.answers.employee ?? null,
            ergonomicRiskFactors: record.answers.ergonomicRiskFactors ?? null,
            comments: record.answers.comments ?? null,
          },
          photo,
        }
      }

      return async function load() {
        const [{ buildIncidentInvestigationPdf }, photoModule] =
          await Promise.all([
            import('@/lib/pdf/incident-investigation-pdf'),
            import('@/lib/pdf/load-photo'),
          ])
        const { loadPdfPhoto, UNAVAILABLE_PHOTO } = photoModule

        /** The photo of the record, never failing the report (§12). */
        async function loadPhoto(
          record: IncidentInvestigation
        ): Promise<PdfPhoto | null> {
          if (!record.photo) return null
          try {
            const blob =
              await incidentInvestigationDefinition.photo?.fetch(record)
            return blob ? await loadPdfPhoto(blob) : UNAVAILABLE_PHOTO
          } catch {
            return UNAVAILABLE_PHOTO
          }
        }

        return {
          async build(record) {
            return buildIncidentInvestigationPdf({
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
