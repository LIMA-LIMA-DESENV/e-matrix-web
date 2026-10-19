'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import type { ManagementPlan } from '@/http/api'

const MAX_SCORE = 16
const Y_TICKS = [0, 4, 8, 12, 16]
const HEIGHT = 240
const PADDING = { top: 12, right: 16, bottom: 36, left: 32 }
/** Narrowest room per period; below it the chart scrolls horizontally. */
const MIN_STEP = 88
/** Rough width of a label character, to shorten labels that would overlap. */
const CHAR_WIDTH = 7
const FALLBACK_WIDTH = 640

function truncate(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}

interface ManagementPlanChartProps {
  plans: ManagementPlan[]
}

/**
 * Score ("Pontuações Anuais") and goal ("Planejado") of every period, in the
 * API order (FR-019). Drawn in SVG, without a chart library (D-9), in pixels
 * of the measured width: with many periods each keeps `MIN_STEP` and the
 * chart scrolls instead of squeezing the labels. The goal line is dashed and
 * its points are squares, so the series are told apart without color.
 */
export function ManagementPlanChart({ plans }: ManagementPlanChartProps) {
  const t = useTranslations('managementPlan.chart')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(FALLBACK_WIDTH)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const count = plans.length
  const width = Math.max(
    containerWidth,
    count * MIN_STEP + PADDING.left + PADDING.right
  )
  const plotWidth = width - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const step = plotWidth / Math.max(count, 1)
  const maxLabelChars = Math.max(4, Math.floor(step / CHAR_WIDTH))

  const x = (index: number) => PADDING.left + step * (index + 0.5)
  const y = (value: number) =>
    PADDING.top + plotHeight * (1 - Math.min(value, MAX_SCORE) / MAX_SCORE)

  const scorePoints = plans.map((plan, i) => `${x(i)},${y(plan.score)}`)
  const goalPoints = plans.map((plan, i) => `${x(i)},${y(plan.goal)}`)

  const description = t('description', {
    summary: plans
      .map((plan) =>
        t('periodSummary', {
          period: plan.period.description,
          score: plan.score,
          goal: plan.goal,
        })
      )
      .join('; '),
  })

  return (
    <section
      aria-labelledby="management-plan-chart-title"
      className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="management-plan-chart-title"
          className="font-headline text-lg font-bold text-on-surface"
        >
          {t('title')}
        </h2>
        <ul className="flex flex-wrap gap-4 text-xs font-medium text-on-surface-variant">
          <li className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                strokeWidth="2"
                className="stroke-primary"
              />
            </svg>
            {t('score')}
          </li>
          <li className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                strokeWidth="2"
                strokeDasharray="5 3"
                className="stroke-secondary"
              />
            </svg>
            {t('goal')}
          </li>
        </ul>
      </div>

      <div ref={containerRef} className="overflow-x-auto">
        <svg
          role="img"
          aria-label={description}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block"
        >
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-outline-variant/60"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-outline text-[11px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {plans.map((plan, i) => (
            <text
              key={plan.period.id}
              x={x(i)}
              y={HEIGHT - PADDING.bottom + 20}
              textAnchor="middle"
              className="fill-on-surface-variant text-[11px] font-medium"
            >
              <title>{plan.period.description}</title>
              {truncate(plan.period.description, maxLabelChars)}
            </text>
          ))}

          <polyline
            points={goalPoints.join(' ')}
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 3"
            className="stroke-secondary"
          />
          <polyline
            points={scorePoints.join(' ')}
            fill="none"
            strokeWidth="2"
            className="stroke-primary"
          />

          {plans.map((plan, i) => (
            <g key={plan.period.id}>
              <rect
                x={x(i) - 4}
                y={y(plan.goal) - 4}
                width="8"
                height="8"
                className="fill-secondary"
              >
                <title>
                  {t('pointTitle', {
                    series: t('goal'),
                    period: plan.period.description,
                    value: plan.goal,
                  })}
                </title>
              </rect>
              <circle
                cx={x(i)}
                cy={y(plan.score)}
                r="4.5"
                className="fill-primary"
              >
                <title>
                  {t('pointTitle', {
                    series: t('score'),
                    period: plan.period.description,
                    value: plan.score,
                  })}
                </title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
