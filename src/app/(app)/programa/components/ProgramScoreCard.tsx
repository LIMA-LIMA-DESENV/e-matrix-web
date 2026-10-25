import { useFormatter, useTranslations } from 'next-intl'

import { Badge, Card } from '@/components/ui'
import type { ProgramScore } from '@/http/api'

/**
 * Current score of the program (R-8, FR-023). Every number comes from the API,
 * which derives it on each read: the value is only formatted here, with up to
 * two decimals in the locale's notation, the bar takes `percentage` and the
 * "Completo" badge `complete`.
 */
export function ProgramScoreCard({ score }: { score: ProgramScore }) {
  const t = useTranslations('programs')
  const format = useFormatter()
  const value = format.number(score.value, { maximumFractionDigits: 2 })
  const max = format.number(score.max, { maximumFractionDigits: 2 })
  const width = Math.min(Math.max(score.percentage, 0), 100)

  return (
    <Card
      className={`relative border p-6 shadow-sm ${
        score.complete
          ? 'border-primary/30 bg-primary/5'
          : 'border-outline-variant/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-headline text-lg font-bold text-on-surface">
          {t('score.title')}
        </h2>
        {score.complete && (
          <Badge color="success">
            <span className="material-symbols-outlined text-sm" aria-hidden>
              verified
            </span>
            {t('complete')}
          </Badge>
        )}
      </div>

      <p className="mt-4 text-right font-headline text-on-surface">
        <span className="text-5xl font-extrabold text-primary">{value}</span>
        <span className="ml-2 text-sm font-semibold text-outline">
          {t('score.ofMax', { max })}
        </span>
      </p>

      <div
        role="progressbar"
        aria-label={t('score.title')}
        aria-valuemin={0}
        aria-valuemax={score.max}
        aria-valuenow={score.value}
        aria-valuetext={t('score.valueText', { value, max })}
        className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-high"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${width}%` }}
        />
      </div>
    </Card>
  )
}
