import { useFormatter, useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import type {
  MatrixChartColor,
  MatrixChartCount,
  MatrixChartSliceCount,
} from './charts'

// Full class names, so Tailwind sees them (tokens of `globals.css`, D-6).
const SLICE_FILL: Record<MatrixChartColor, string> = {
  high: 'fill-chart-high',
  medium: 'fill-chart-medium',
  low: 'fill-chart-low',
}

const SWATCH_BG: Record<MatrixChartColor, string> = {
  high: 'bg-chart-high',
  medium: 'bg-chart-medium',
  low: 'bg-chart-low',
}

/** Where the tooltip of a slice points, as a fraction of the radius. */
const TOOLTIP_RADIUS = 0.6

interface SliceShape {
  slice: MatrixChartSliceCount
  /** The arc path, or `null` for a slice that is the whole pie. */
  path: string | null
  /** The middle angle of the slice, in radians. */
  middle: number
}

function pointAt(angle: number) {
  return `${Math.cos(angle)} ${Math.sin(angle)}`
}

/**
 * The slices with a count as arcs of the unit circle, clockwise from the
 * top. A slice of 100% is a circle, since an arc of 360° draws nothing.
 */
function getSliceShapes(count: MatrixChartCount): SliceShape[] {
  const shapes: SliceShape[] = []
  let start = -Math.PI / 2

  for (const slice of count.slices) {
    if (slice.count === 0) continue

    const angle = (slice.count / count.withValue) * 2 * Math.PI
    const end = start + angle
    const largeArc = angle > Math.PI ? 1 : 0

    shapes.push({
      slice,
      path:
        slice.count === count.withValue
          ? null
          : `M 0 0 L ${pointAt(start)} A 1 1 0 ${largeArc} 1 ${pointAt(end)} Z`,
      middle: start + angle / 2,
    })
    start = end
  }

  return shapes
}

interface MatrixPieChartProps {
  title: string
  /** The level of the title, under the headings around the pie. */
  heading?: 'h2' | 'h3' | 'h4'
  count: MatrixChartCount
  /** The translated label of a slice value. */
  labelOf: (value: string) => string
  /** Opens the Resultados of a slice with a count (FR-015). */
  onSliceActivate: (value: string) => void
}

/**
 * One pie of a map, in SVG without a chart library (D-3), sized by its
 * `viewBox` to the width of its container (NFR-004). The legend lists every
 * slice in the map order, with label, count and percent, so color is not the
 * only reading (NFR-003); the slices with 0 stay in the legend and out of the
 * pie (FR-008). The tooltip shows on hovering a slice or a legend item, and on
 * focusing the item. With no value at all the pie is a neutral circle with
 * "Sem dados" (FR-013). The activities without a value are counted apart,
 * below the pie (FR-007). A slice with a count, and its legend item, opens
 * the Resultados of its activities on a click, or on Enter or Space on the
 * item (FR-015); the slices with 0 and "Sem dados" open nothing.
 */
export function MatrixPieChart({
  title,
  heading: Heading = 'h2',
  count,
  labelOf,
  onSliceActivate,
}: MatrixPieChartProps) {
  const t = useTranslations('matrix.charts')
  const format = useFormatter()
  const titleId = useId()
  const [activeValue, setActiveValue] = useState<string | null>(null)

  const shapes = getSliceShapes(count)
  const active = shapes.find(({ slice }) => slice.value === activeValue)
  const hasData = count.withValue > 0

  function sliceLabel(slice: MatrixChartSliceCount) {
    return t('sliceLabel', {
      label: labelOf(slice.value),
      count: slice.count,
      percent: format.number(slice.percent),
    })
  }

  const description = t('description', {
    title,
    summary: hasData ? count.slices.map(sliceLabel).join('; ') : t('noData'),
  })

  const show = (value: string) => () => setActiveValue(value)
  const hide = () => setActiveValue(null)

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-6"
    >
      {/* A long group label wraps instead of widening the card. */}
      <Heading
        id={titleId}
        className="font-headline text-lg font-bold text-on-surface [overflow-wrap:anywhere]"
      >
        {title}
      </Heading>

      <div className="relative mx-auto aspect-square w-full max-w-56">
        <svg
          role="img"
          aria-label={description}
          viewBox="-1 -1 2 2"
          className="block size-full"
        >
          {!hasData ? (
            <circle r="1" className="fill-surface-container-high" />
          ) : (
            shapes.map(({ slice, path }) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: mouse only; the legend button of each slice carries the focus, the tooltip and the same activation by keyboard (AC-014)
              <g
                key={slice.value}
                className={`${SLICE_FILL[slice.color]} cursor-pointer stroke-surface-container-lowest transition-opacity ${
                  active && active.slice !== slice ? 'opacity-50' : ''
                }`}
                onMouseEnter={show(slice.value)}
                onMouseLeave={hide}
                onClick={() => onSliceActivate(slice.value)}
              >
                {path === null ? (
                  <circle r="1" strokeWidth="0" />
                ) : (
                  <path d={path} strokeWidth="0.02" strokeLinejoin="round" />
                )}
              </g>
            ))
          )}
        </svg>

        {!hasData && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-on-surface-variant"
          >
            {t('noData')}
          </span>
        )}

        {active && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-inverse-surface px-2.5 py-1.5 text-xs font-semibold text-inverse-on-surface shadow-md"
            style={{
              left: `${50 + 50 * TOOLTIP_RADIUS * Math.cos(active.middle)}%`,
              top: `${50 + 50 * TOOLTIP_RADIUS * Math.sin(active.middle)}%`,
            }}
          >
            {labelOf(active.slice.value)}:{' '}
            {t('tooltip', {
              count: active.slice.count,
              percent: format.number(active.slice.percent),
            })}
          </div>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        {count.slices.map((slice) => {
          const content = (
            <>
              <span
                aria-hidden
                className={`size-3 shrink-0 rounded-sm ${SWATCH_BG[slice.color]}`}
              />
              <span className="flex-1 truncate font-medium">
                {labelOf(slice.value)}
              </span>
              <span className="tabular-nums text-on-surface-variant">
                {t('tooltip', {
                  count: slice.count,
                  percent: format.number(slice.percent),
                })}
              </span>
            </>
          )

          // Only the slices in the pie take focus and open the Resultados
          // (AC-014); the ones with 0 are listed to show the whole map.
          return (
            <li key={slice.value}>
              {slice.count > 0 ? (
                <button
                  type="button"
                  aria-label={sliceLabel(slice)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/40"
                  onClick={() => onSliceActivate(slice.value)}
                  onMouseEnter={show(slice.value)}
                  onMouseLeave={hide}
                  onFocus={show(slice.value)}
                  onBlur={hide}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 text-outline">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {count.withoutValue > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant">
          <span className="material-symbols-outlined text-base" aria-hidden>
            info
          </span>
          {t('withoutValue', {
            missing: format.number(count.withoutValue),
            total: count.total,
          })}
        </p>
      )}
    </section>
  )
}
