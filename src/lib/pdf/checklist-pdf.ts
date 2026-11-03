import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React (D-7).
 */
export interface ChecklistPdfLabels {
  title: string
  fields: {
    name: string
    sector: string
    date: string
    activity: string
  }
  /** "Sim (1)": the option and the points it is worth. */
  yes: (points: number) => string
  /** "Não (0)". */
  no: (points: number) => string
  pointsSum: string
  percentage: string
  /** The sentence above the five bands. */
  legendTitle: string
  /** The five bands, from the best: "91-100% dos pontos", "Condição …". */
  bands: { range: string; label: string }[]
  /** "Classificação Global do Posto de trabalho". */
  globalClassification: string
}

/** A question as the report prints it. */
export interface ChecklistPdfQuestion {
  /** 1 to 55, the number of the legacy form. */
  number: number
  text: string
  /** The answer that is worth a point: `true` is yes. */
  expected: boolean
  /** The marked answer; `null` marks neither (blank form or not answered). */
  answer: boolean | null
}

/** A block with its questions and its already formatted score. */
export interface ChecklistPdfBlock {
  title: string
  questions: ChecklistPdfQuestion[]
  /** `''` in the blank form. */
  sum: string
  /** Formatted in the user's language; `''` in the blank form or when null. */
  percentage: string
}

/** The identification of a Coleta de Dados, already formatted. */
export interface ChecklistPdfRecord {
  code: string
  name: string
  sector: string
  /** Formatted in the user's locale. */
  date: string
  /** `código — nome`. */
  activity: string
  /** The global classification, formatted; `''` when null. */
  average: string
}

export interface BuildChecklistPdfInput {
  /** The record, or `null` for the blank form (FR-014). */
  record: ChecklistPdfRecord | null
  /** The 11 blocks; in the blank form, no answer, sum or percentage. */
  blocks: ChecklistPdfBlock[]
  labels: ChecklistPdfLabels
}

// The legacy report is black on white with thin dark borders
// (`checklist.scss`); the marked option has the pink rounded border of
// `span.selected` (`_show.sass`), and the bands have their own colors.
const BORDER = '#363636'
const HEADER = '#e6e6e6'
const MARK = '#e91e63'
const TEXT = '#000000'
const WHITE = '#ffffff'
const BAND_COLORS = ['#458f68', '#71dea5', '#f2d019', '#f26e19', '#e62418']

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 1.5
const TITLE_HEIGHT = 12
const GAP = 4
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }

const FONT_SIZE = 9

const NUMBER_WIDTH = 9
const OPTION_WIDTH = 22
const POINTS_WIDTH = 13
const LABEL_WIDTH = 30

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/** The custom part of a cell, read back by `drawCell`. */
interface ChecklistCell extends CellDef {
  /** The option marked in the record: drawn with the pink border. */
  marked?: boolean
}

/** Draws the pink rounded border of the marked option around its text. */
function drawMark(doc: jsPDF, data: CellHookData) {
  const { cell } = data
  const inset = 0.6

  doc.setDrawColor(MARK)
  doc.setLineWidth(0.5)
  doc.roundedRect(
    cell.x + inset,
    cell.y + inset,
    cell.width - inset * 2,
    cell.height - inset * 2,
    1.2,
    1.2,
    'S'
  )
}

function drawCell(doc: jsPDF, data: CellHookData) {
  if (data.section !== 'body') return

  const raw = data.cell.raw as ChecklistCell | undefined
  if (raw && typeof raw === 'object' && raw.marked) drawMark(doc, data)
}

/**
 * Builds the portrait A4 report of a Coleta de Dados In Loco, or its blank
 * form (FR-016, FR-014), as the legacy `checklist.pdf.twig`: the name,
 * sector, date and activity; one table per block, each question with its
 * number, its text, "Sim (pontos)", "Não (pontos)" with the marked one
 * highlighted, and the point it scored; the sum and percentage of the block;
 * the legend of the five bands; and the summary of the blocks with the
 * global classification. Every value is printed as text (NFR-004), with
 * jsPDF's Helvetica, which covers the accents of pt-BR and es.
 */
export function buildChecklistPdf({
  record,
  blocks,
  labels,
}: BuildChecklistPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const questionWidth =
    contentWidth - NUMBER_WIDTH - OPTION_WIDTH * 2 - POINTS_WIDTH

  doc.setProperties({
    title: record ? `${labels.title} ${record.code}` : labels.title,
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(TEXT)
  doc.text(labels.title, MARGIN, MARGIN, { baseline: 'top' })
  if (record) {
    doc.text(record.code, pageWidth - MARGIN, MARGIN, {
      align: 'right',
      baseline: 'top',
    })
  }

  const base: UserOptions = {
    theme: 'grid',
    margin: MARGINS,
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      textColor: TEXT,
      fillColor: WHITE,
      lineColor: BORDER,
      lineWidth: 0.2,
      cellPadding: PADDING,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: HEADER,
      textColor: TEXT,
      fontStyle: 'bold',
      halign: 'center',
    },
    rowPageBreak: 'avoid',
    didDrawCell: (data) => drawCell(doc, data),
  }

  let cursor = MARGIN + TITLE_HEIGHT

  // Each table starts below the previous one, on the page it ended.
  function table(options: UserOptions) {
    let end = cursor

    autoTable(doc, {
      ...base,
      startY: cursor,
      ...options,
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    cursor = end + GAP
  }

  const bold = { fontStyle: 'bold' as const }

  // The identification, a label beside each value.
  table({
    columnStyles: { 0: { cellWidth: LABEL_WIDTH, ...bold } },
    body: [
      [labels.fields.name, record?.name ?? ''],
      [labels.fields.sector, record?.sector ?? ''],
      [labels.fields.date, record?.date ?? ''],
      [labels.fields.activity, record?.activity ?? ''],
    ],
  })

  // One table per block: its questions, then its sum and percentage.
  const option = (text: string, marked: boolean): ChecklistCell => ({
    content: text,
    marked,
    styles: marked ? bold : {},
  })
  const scoreRow = (label: string, value: string): RowInput => [
    { content: label, colSpan: 2, styles: { ...bold, halign: 'right' } },
    { content: value, colSpan: 3, styles: { ...bold, halign: 'center' } },
  ]

  for (const block of blocks) {
    table({
      head: [[{ content: block.title, colSpan: 5 }]],
      body: [
        ...block.questions.map((question): RowInput => {
          const yesPoints = question.expected ? 1 : 0
          const scored =
            question.answer === null
              ? ''
              : String(question.answer === question.expected ? 1 : 0)

          return [
            { content: String(question.number), styles: { halign: 'center' } },
            question.text,
            option(labels.yes(yesPoints), question.answer === true),
            option(labels.no(1 - yesPoints), question.answer === false),
            { content: scored, styles: { halign: 'center' } },
          ]
        }),
        scoreRow(labels.pointsSum, block.sum),
        scoreRow(labels.percentage, block.percentage),
      ],
      columnStyles: {
        0: { cellWidth: NUMBER_WIDTH },
        1: { cellWidth: questionWidth },
        2: { cellWidth: OPTION_WIDTH },
        3: { cellWidth: OPTION_WIDTH },
        4: { cellWidth: POINTS_WIDTH },
      },
    })
  }

  // The legend of the five bands, each label over its color.
  table({
    head: [[{ content: `${labels.legendTitle}:`, colSpan: 2 }]],
    body: labels.bands.map(({ range, label }, i) => [
      { content: range, styles: bold },
      { content: label, styles: { fillColor: BAND_COLORS[i] } },
    ]),
    columnStyles: { 0: { cellWidth: contentWidth / 2 } },
  })

  // The summary: the percentage of each block, then the global
  // classification (the API `average`).
  const summaryColumns = {
    0: {
      cellWidth: (contentWidth * 2) / 3,
      halign: 'center' as const,
      ...bold,
    },
    1: { halign: 'center' as const },
  }

  // The summary stays on one page: it starts a new one when its rows (each
  // one line high) and the global classification do not fit below.
  const rowHeight = lineHeight(doc, FONT_SIZE) + PADDING * 2
  const summaryHeight = (blocks.length + 1) * rowHeight + GAP
  const pageHeight = doc.internal.pageSize.getHeight()

  if (cursor + summaryHeight > pageHeight - MARGIN) {
    doc.addPage()
    cursor = MARGIN
  }

  table({
    body: blocks.map((block) => [block.title, block.percentage]),
    columnStyles: summaryColumns,
  })

  table({
    body: [[labels.globalClassification, record?.average ?? '']],
    columnStyles: summaryColumns,
  })

  return doc.output('blob')
}
