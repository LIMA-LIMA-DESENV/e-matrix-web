import { jsPDF } from 'jspdf'
import { autoTable, type CellDef, type UserOptions } from 'jspdf-autotable'
import {
  RISK_FACTOR_BODY_PART_TITLES,
  RISK_FACTOR_COLUMN_TITLES,
  RISK_FACTOR_FIGURE,
  RISK_FACTOR_ITEMS,
  type RiskFactorBodyPart,
  type RiskFactorBox,
  type RiskFactorColumnTitle,
  type RiskFactorKey,
} from '@/app/(app)/avaliacoes/components/risk-factor-board'
import type { PdfPhoto } from './load-photo'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface RiskFactorPdfLabels {
  /** The type: "Identificação de Riscos". */
  title: string
  /** The titles over the figure (`evaluations.riskFactorBoard.columns`). */
  columns: Record<RiskFactorColumnTitle, string>
  /** The body parts beside the figure (`…riskFactorBoard.bodyParts`). */
  bodyParts: Record<RiskFactorBodyPart, string>
  /** The 39 items (`…riskFactorBoard.items`). */
  items: Record<RiskFactorKey, string>
  /** The lines of the table (`evaluations.pdf.riskFactor.fields`). */
  fields: {
    date: string
    activity: string
    area: string
    fabric: string
    valuer: string
    notes: string
    total: string
  }
}

/** An Identificação de Riscos, every value already formatted. */
export interface RiskFactorPdfRecord {
  code: string
  /** Formatted in the user's locale. */
  date: string
  /** `código — nome`. */
  activity: string
  /** The current area and fabric of the activity (R-6). */
  area: string
  fabric: string
  valuer: string
  /** As typed, with its line breaks. */
  notes: string
  /** In the user's number format. */
  total: string
  /** The items marked `true`; every other one is not marked. */
  marked: readonly RiskFactorKey[]
}

/**
 * The legacy figure once it went through `loadPdfPhoto`: JPEG, which keeps
 * its thin lines at this size (RK-4). The PDF is not made without it, since
 * the marks would mean nothing.
 */
export type RiskFactorPdfImage = Extract<PdfPhoto, { status: 'ready' }>

export interface BuildRiskFactorPdfInput {
  /** The record, or `null` for the blank form (FR-020). */
  record: RiskFactorPdfRecord | null
  labels: RiskFactorPdfLabels
  image: RiskFactorPdfImage
}

// The legacy report is black on white; a marked item has the pink rounded
// border of the legacy `span.selected` (2 px `#E91E63`, 5 px radius).
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'
const MARK = '#E91E63'

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 1.8
const TITLE_HEIGHT = 12
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2

const FONT_SIZE = 9

/** The legacy figure is shown at 691 px wide: its 2 px and 5 px, in mm. */
const LEGACY_PX = 1 / 691
const MARK_WIDTH_SHARE = 2 * LEGACY_PX
const MARK_RADIUS_SHARE = 5 * LEGACY_PX

/** Font sizes on the figure, in points; a text shrinks down to the minimum. */
const COLUMN_TITLE_SIZE = 7
const BODY_PART_SIZE = 8
const ITEM_SIZE = 6.5
const MIN_SIZE = 4.5
/** A label below a drawing takes at most two lines of its size. */
const BELOW_LINES = 2
/** The room between a text and the edge of its box, clear of the mark. */
const TEXT_INSET = 1.2

/** A line of the table: room for a value written by hand. */
const LINE_MIN_HEIGHT = 9
/** "Observações" in the blank form: its label and 5 lines to write on. */
const BLANK_NOTES_MIN_HEIGHT = LINE_MIN_HEIGHT * 5

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, '\n')
}

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/**
 * Breaks `text` into lines that fit `width` and `height`, from `size` down
 * to `MIN_SIZE` (RK-2). At the minimum it keeps the lines as they are, so a
 * text is never cut.
 */
function fitText(
  doc: jsPDF,
  text: string,
  width: number,
  height: number,
  size: number
) {
  for (let current = size; ; current -= 0.5) {
    doc.setFontSize(current)
    const lines: string[] = doc.splitTextToSize(text, width)
    const fits =
      lines.length * lineHeight(doc, current) <= height &&
      lines.every((line) => doc.getTextWidth(line) <= width)

    if (fits || current - 0.5 < MIN_SIZE) return { lines, size: current }
  }
}

/**
 * Writes `text` centered in `rect`: in the middle of it, or against its
 * bottom, below a drawing.
 */
function drawLabel(
  doc: jsPDF,
  text: string,
  rect: Rect,
  options: { size: number; bold?: boolean; place: 'center' | 'below' }
) {
  const width = rect.w - TEXT_INSET * 2
  const room = rect.h - TEXT_INSET * 2
  const height =
    options.place === 'below'
      ? Math.min(room, lineHeight(doc, options.size) * BELOW_LINES)
      : room

  doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
  doc.setTextColor(TEXT)
  const { lines, size } = fitText(doc, text, width, height, options.size)
  const textHeight = lines.length * lineHeight(doc, size)
  const top =
    options.place === 'below'
      ? rect.y + rect.h - TEXT_INSET - textHeight
      : rect.y + (rect.h - textHeight) / 2

  doc.text(lines, rect.x + rect.w / 2, top, {
    align: 'center',
    baseline: 'top',
  })
}

/**
 * Draws the figure across the content width, from `top`, with the titles,
 * the body parts and the items' labels at the places of the board, and the
 * pink border around each marked item. Returns where the figure ends.
 */
function drawBoard(
  doc: jsPDF,
  labels: RiskFactorPdfLabels,
  image: RiskFactorPdfImage,
  marked: ReadonlySet<RiskFactorKey>,
  top: number,
  width: number
) {
  const height = (width * RISK_FACTOR_FIGURE.height) / RISK_FACTOR_FIGURE.width
  const toRect = (box: RiskFactorBox): Rect => ({
    x: MARGIN + box.x * width,
    y: top + box.y * height,
    w: box.w * width,
    h: box.h * height,
  })

  doc.addImage(image.data, 'JPEG', MARGIN, top, width, height)

  for (const title of RISK_FACTOR_COLUMN_TITLES) {
    drawLabel(doc, labels.columns[title.key], toRect(title.box), {
      size: COLUMN_TITLE_SIZE,
      bold: true,
      place: 'center',
    })
  }

  for (const title of RISK_FACTOR_BODY_PART_TITLES) {
    drawLabel(doc, labels.bodyParts[title.bodyPart], toRect(title.box), {
      size: BODY_PART_SIZE,
      bold: true,
      place: 'center',
    })
  }

  const markWidth = MARK_WIDTH_SHARE * width
  const markRadius = MARK_RADIUS_SHARE * width

  for (const item of RISK_FACTOR_ITEMS) {
    const rect = toRect(item.box)

    drawLabel(doc, labels.items[item.key], rect, {
      size: ITEM_SIZE,
      place: item.label,
    })

    if (marked.has(item.key)) {
      // The border is drawn inside the box, so two marked neighbors do not
      // overlap.
      const inset = markWidth / 2

      doc.setDrawColor(MARK)
      doc.setLineWidth(markWidth)
      doc.roundedRect(
        rect.x + inset,
        rect.y + inset,
        rect.w - inset * 2,
        rect.h - inset * 2,
        markRadius,
        markRadius,
        'S'
      )
    }
  }

  return top + height
}

/**
 * Builds the portrait A4 report of an Identificação de Riscos, or its blank
 * form (FR-019, FR-020), as the legacy `riskfactor.pdf.twig`: the title of
 * the type and the code; the legacy figure across the content width, with
 * the column titles, the body parts and the items' labels at the places of
 * `risk-factor-board.ts`, and each marked item inside the legacy pink
 * rounded border; then the table, one line per field: Data, Atividade, Área
 * and Fábrica, Avaliador, Observações (with its line breaks) and Total de
 * fatores de risco.
 *
 * The blank form has no code, no marks and no values, its lines high enough
 * to write on and "Observações" at least 5 lines high. The table may go on
 * the next page; a line moves there whole, unless it is taller than a page.
 * The text is in jsPDF's Helvetica (WinAnsi), which covers the accents of
 * pt-BR and es and the "—" (NFR-007).
 */
export function buildRiskFactorPdf({
  record,
  labels,
  image,
}: BuildRiskFactorPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2

  doc.setProperties({
    title: record ? `${labels.title} ${record.code}` : labels.title,
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(TEXT)
  doc.text(labels.title, MARGIN, MARGIN, {
    baseline: 'top',
    maxWidth: record ? contentWidth - 30 : contentWidth,
  })
  if (record) {
    doc.text(record.code, pageWidth - MARGIN, MARGIN, {
      align: 'right',
      baseline: 'top',
    })
  }

  const boardEnd = drawBoard(
    doc,
    labels,
    image,
    new Set(record?.marked ?? []),
    MARGIN + TITLE_HEIGHT,
    contentWidth
  )

  const { fields } = labels

  function line(label: string, value: string | undefined): CellDef {
    return {
      content: `${label}: ${normalizeLineBreaks(value ?? '')}`,
      styles: { minCellHeight: LINE_MIN_HEIGHT },
    }
  }

  const options: UserOptions = {
    theme: 'grid',
    margin: MARGINS,
    startY: boardEnd + 3,
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      textColor: TEXT,
      fillColor: WHITE,
      lineColor: BORDER,
      lineWidth: LINE_WIDTH,
      cellPadding: PADDING,
      valign: 'top',
      overflow: 'linebreak',
    },
    // A line moves to the next page whole; a line taller than a page is
    // split from where it starts, inside its cell, so no text is cut.
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    columnStyles: { 0: { cellWidth: contentWidth / 2 } },
    body: [
      [{ ...line(fields.date, record?.date), colSpan: 2 }],
      [{ ...line(fields.activity, record?.activity), colSpan: 2 }],
      [line(fields.area, record?.area), line(fields.fabric, record?.fabric)],
      [{ ...line(fields.valuer, record?.valuer), colSpan: 2 }],
      [
        {
          ...line(fields.notes, record?.notes),
          colSpan: 2,
          styles: {
            minCellHeight: record ? LINE_MIN_HEIGHT : BLANK_NOTES_MIN_HEIGHT,
          },
        },
      ],
      [{ ...line(fields.total, record?.total), colSpan: 2 }],
    ],
  }

  autoTable(doc, options)

  return doc.output('blob')
}
