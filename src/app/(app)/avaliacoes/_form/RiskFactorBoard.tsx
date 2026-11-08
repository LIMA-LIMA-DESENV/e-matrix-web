'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'

import {
  RISK_FACTOR_BODY_PART_TITLES,
  RISK_FACTOR_COLUMN_TITLES,
  RISK_FACTOR_FIGURE,
  RISK_FACTOR_ITEMS,
  type RiskFactorBox,
  type RiskFactorKey,
} from '../components/risk-factor-board'

/** A box of the board, placed in percent of the figure (D-6). */
function placeAt(box: RiskFactorBox): CSSProperties {
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  }
}

export interface RiskFactorBoardProps {
  /** The 39 items, `true` when marked. */
  value: Readonly<Record<RiskFactorKey, boolean>>
  /** Turns one item on or off; the others stay as they are (R-8). */
  onToggle(key: RiskFactorKey): void
  /** Names the board as a group. */
  'aria-label'?: string
}

/**
 * The risk factor board of the Identificação de Riscos (FR-017, R-11): the
 * legacy figure, with the column titles, the body parts and, over each of
 * the 39 boxes of `risk-factor-board.ts`, a toggle button with the item's
 * label. A click, Enter or Space turns the item on or off (`aria-pressed`);
 * its accessible name is "<body part> — <item>", so it never depends on the
 * figure (NFR-008). A marked item has the legacy border, 2 px of
 * `--color-evaluation-mark` with a 5 px radius, besides `aria-pressed`, so
 * its state is not told by the color alone. Inside a disabled fieldset (the
 * view, the Viewer, the form being sent) the buttons are inert and the marks
 * stay visible.
 *
 * The figure keeps its proportion and never gets narrower than its 432 px:
 * on a narrower screen only the board's own box scrolls sideways, never the
 * page (H-6). The texts scale with the figure (container units).
 */
export function RiskFactorBoard({
  value,
  onToggle,
  'aria-label': label,
}: RiskFactorBoardProps) {
  const t = useTranslations('evaluations.riskFactorBoard')

  return (
    <div className="max-w-full overflow-x-auto">
      {/* The group of the 39 items; the form's disabled fieldset still
          disables them. */}
      <fieldset
        aria-label={label}
        className="@container relative m-0 min-w-[432px] max-w-[691px] border-0 p-0 select-none"
        style={{
          aspectRatio: `${RISK_FACTOR_FIGURE.width} / ${RISK_FACTOR_FIGURE.height}`,
        }}
      >
        {/* Decorative: every item is named by its button. */}
        <Image
          src={RISK_FACTOR_FIGURE.src}
          alt=""
          width={RISK_FACTOR_FIGURE.width}
          height={RISK_FACTOR_FIGURE.height}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {RISK_FACTOR_COLUMN_TITLES.map((title) => (
          <span
            key={title.key}
            aria-hidden
            style={placeAt(title.box)}
            className="absolute flex items-center justify-center text-center text-[max(7px,1.75cqw)] leading-none font-bold text-black"
          >
            {t(title.labelKey)}
          </span>
        ))}

        {RISK_FACTOR_BODY_PART_TITLES.map((title) => (
          <span
            key={title.bodyPart}
            aria-hidden
            style={placeAt(title.box)}
            className="absolute flex items-center justify-center px-[0.5cqw] text-center text-[max(8px,2cqw)] leading-tight font-bold break-words text-black"
          >
            {t(title.labelKey)}
          </span>
        ))}

        {RISK_FACTOR_ITEMS.map((item) => {
          const isMarked = value[item.key] === true

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={isMarked}
              aria-label={t('itemName', {
                bodyPart: t(`bodyParts.${item.group}`),
                item: t(item.labelKey),
              })}
              onClick={() => onToggle(item.key)}
              style={placeAt(item.box)}
              className={`absolute flex flex-col items-center rounded-[5px] border-2 px-[0.4cqw] pb-[0.3cqw] text-center text-[max(7px,1.6cqw)] leading-tight break-words text-black enabled:cursor-pointer enabled:hover:bg-evaluation-mark/5 disabled:cursor-default ${
                item.label === 'below' ? 'justify-end' : 'justify-center'
              } ${isMarked ? 'border-evaluation-mark' : 'border-transparent'}`}
            >
              {t(item.labelKey)}
            </button>
          )
        })}
      </fieldset>
    </div>
  )
}
