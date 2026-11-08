'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { RiskFactor } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'
import type {
  RiskFactorPdfImage,
  RiskFactorPdfLabels,
  RiskFactorPdfRecord,
} from '@/lib/pdf/risk-factor-pdf'

import { formatEvaluationActivity } from '../components/listing'
import {
  RISK_FACTOR_BODY_PARTS,
  RISK_FACTOR_COLUMN_TITLES,
  RISK_FACTOR_FIGURE,
  RISK_FACTOR_KEYS,
  type RiskFactorBodyPart,
  type RiskFactorColumnTitle,
  type RiskFactorKey,
} from '../components/risk-factor-board'
import type { EvaluationPdfAdapter } from './types'

const COLUMN_TITLES: readonly RiskFactorColumnTitle[] =
  RISK_FACTOR_COLUMN_TITLES.map((title) => title.key)

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
 * The report of an Identificação de Riscos and its blank form (J5, FR-019,
 * FR-020). The date and the total are formatted in the user's locale, the
 * activity is `código — nome` as on the listing, the area and fabric are the
 * current ones of the detail (R-6), and only the items answered `true` are
 * marked (R-10). `jspdf`, the report module and the legacy figure are loaded
 * only on demand (NFR-007); the figure goes through `loadPdfPhoto`, as JPEG
 * (RK-4, decided in T-003). Without the figure there is no PDF, since the
 * marks would mean nothing: the failure shows `evaluations.pdf.error` (§12).
 */
export const riskFactorPdfAdapter: EvaluationPdfAdapter<RiskFactor> = {
  usePdfBuilder() {
    const t = useTranslations('evaluations')
    const format = useFormatter()
    const formatDateOnly = useFormatDateOnly()

    function labels(): RiskFactorPdfLabels {
      return {
        title: t('pdf.riskFactor.title'),
        columns: textsOf(COLUMN_TITLES, (key) =>
          t(`riskFactorBoard.columns.${key}`)
        ),
        bodyParts: textsOf<RiskFactorBodyPart>(RISK_FACTOR_BODY_PARTS, (key) =>
          t(`riskFactorBoard.bodyParts.${key}`)
        ),
        items: textsOf<RiskFactorKey>(RISK_FACTOR_KEYS, (key) =>
          t(`riskFactorBoard.items.${key}`)
        ),
        fields: {
          date: t('pdf.riskFactor.fields.date'),
          activity: t('pdf.riskFactor.fields.activity'),
          area: t('pdf.riskFactor.fields.area'),
          fabric: t('pdf.riskFactor.fields.fabric'),
          valuer: t('pdf.riskFactor.fields.valuer'),
          notes: t('pdf.riskFactor.fields.notes'),
          total: t('pdf.riskFactor.fields.total'),
        },
      }
    }

    function toPdfRecord(record: RiskFactor): RiskFactorPdfRecord {
      const answers = record.answers as unknown as Record<string, unknown>

      return {
        code: record.code,
        date: formatDateOnly(record.date) ?? '',
        activity: formatEvaluationActivity(record.activity),
        area: record.activity.area,
        fabric: record.activity.fabric,
        valuer: record.valuer,
        notes: record.notes,
        total: format.number(record.total, { maximumFractionDigits: 20 }),
        marked: RISK_FACTOR_KEYS.filter((key) => answers[key] === true),
      }
    }

    return async function load() {
      const [{ buildRiskFactorPdf }, { loadPdfPhoto }] = await Promise.all([
        import('@/lib/pdf/risk-factor-pdf'),
        import('@/lib/pdf/load-photo'),
      ])

      const response = await fetch(RISK_FACTOR_FIGURE.src)
      if (!response.ok) {
        throw new Error(`Risk factor figure: HTTP ${response.status}`)
      }
      const photo = await loadPdfPhoto(await response.blob())
      if (photo.status !== 'ready') {
        throw new Error('Risk factor figure could not be decoded.')
      }
      const image: RiskFactorPdfImage = photo

      return {
        build(record) {
          return buildRiskFactorPdf({
            record: record ? toPdfRecord(record) : null,
            labels: labels(),
            image,
          })
        },
      }
    }
  },
}
