import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  PRIORITY_CRITERION_BANDS,
  PRIORITY_CRITERION_CATEGORIES,
  PRIORITY_CRITERION_QUESTIONS,
  type PriorityCriterionLevel,
  type PriorityCriterionOptionKey,
  type PriorityCriterionQuestionField,
  type PriorityCriterionSolutionKey,
} from '@/app/(app)/avaliacoes/components/priority-criterion-questions'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface PriorityCriterionPdfLabels {
  /** The type: "Critério de Prioridade". */
  title: string
  /** The header (`evaluations.pdf.priorityCriterion.fields`). */
  fields: {
    date: string
    sector: string
    numberOfEmployees: string
    activity: string
    area: string
    fabric: string
  }
  /** The 5 questions (`evaluations.priorityCriterionQuestions.questions`). */
  questions: Record<PriorityCriterionQuestionField, string>
  /** The options (`…priorityCriterionQuestions.options`). */
  options: Record<PriorityCriterionOptionKey, string>
  /** "Soma". */
  sum: string
  /** Each band's priority and action (`…priorityCriterionQuestions.levels`). */
  levels: Record<PriorityCriterionLevel, { priority: string; action: string }>
  /** "Categorias de prioridades". */
  categoriesTitle: string
  /** The 5 categories (`…priorityCriterionQuestions.categories`). */
  categories: Record<PriorityCriterionSolutionKey, string>
  /** The columns of the categories table: "Categoria" and "Ações". */
  category: string
  actions: string
  /** "Avaliador" and "Assinatura", at the foot. */
  valuer: string
  signature: string
}

/** A Critério de Prioridade, every value already formatted. */
export interface PriorityCriterionPdfRecord {
  code: string
  /** Formatted in the user's locale. */
  date: string
  sector: string
  /** In the user's number format. */
  numberOfEmployees: string
  /** `código — nome`. */
  activity: string
  /** The current area and fabric of the activity (R-6). */
  area: string
  fabric: string
  /** The valuer, printed beside the signature line. */
  responsible: string
  /** The points answered to each question; `null` marks no option. */
  answers: Record<PriorityCriterionQuestionField, number | null>
  /** The `priority` of the API detail: the sum and its band. */
  priority: { sum: number; level: PriorityCriterionLevel }
  /** As typed, with their line breaks; `null` or `''` when blank. */
  solutions: Record<PriorityCriterionSolutionKey, string | null>
}

export interface BuildPriorityCriterionPdfInput {
  /** The record, or `null` for the blank form (FR-021). */
  record: PriorityCriterionPdfRecord | null
  labels: PriorityCriterionPdfLabels
}

// Black on white with thin black borders, as the legacy report; the chosen
// option and the action of the priority have the pink rounded border of the
// legacy `span.selected` (2 px `#E91E63`, 5 px radius); the bands of the
// ruler have the legacy colors of `priority-criterion-questions.ts`.
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'
const MARK = '#E91E63'

/** CSS px of the legacy report, at 96 px per inch. */
function px(value: number) {
  return (value * 25.4) / 96
}

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 1.8
const TITLE_HEIGHT = 12
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2
/** The legacy `<br>` between the blocks. */
const GAP = 5

const FONT_SIZE = 9
const QUESTION_FONT_SIZE = 10
const BAND_FONT_SIZE = 8

const MARK_WIDTH = px(2)
const MARK_RADIUS = px(5)
/** Room between an option's text and its border. */
const OPTION_PADDING_X = 1.5
const OPTION_PADDING_Y = 0.8
/** Room between the action of the priority and its border. */
const ACTION_PADDING_X = 2.5
/** Room between two options on a line. */
const OPTION_GAP = 6
/** Room between a question and its options, and below the options. */
const QUESTION_GAP = 1.2
const QUESTION_SPACING = 3

/** The header: label columns, the values sharing what is left. */
const HEADER_LABEL_WIDTHS = [21, 21, 31]
/** A value of the blank header: room to write by hand. */
const BLANK_HEADER_HEIGHT = 9

/** The legacy `<COL WIDTH>` of the categories table. */
const CATEGORY_COLUMNS = [37, 208, 373]
/** The legacy `HEIGHT` of each category row, in its order. */
const CATEGORY_MIN_HEIGHTS = [65, 27, 27, 40, 39].map(px)

/** The legacy `<COL WIDTH>` of the foot: label, line, label, line. */
const FOOT_COLUMNS = [78, 251, 90, 239]
const FOOT_HEIGHT = 10

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function text(value: string | null | undefined) {
  return (value ?? '').replace(/\r\n?/g, '\n')
}

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/** Draws the legacy pink rounded border. */
function drawMark(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(MARK)
  doc.setLineWidth(MARK_WIDTH)
  doc.roundedRect(x, y, w, h, MARK_RADIUS, MARK_RADIUS, 'S')
}

/** The action cell of the ruler, told apart by `marked`. */
interface ActionCell extends CellDef {
  marked: boolean
}

/** The pink border around the text of the action of the priority. */
function drawActionMark(doc: jsPDF, data: CellHookData) {
  const { cell } = data
  const raw = cell.raw as Partial<ActionCell> | undefined
  if (data.section !== 'body' || !raw || typeof raw !== 'object') return
  if (!raw.marked) return

  const content = String(raw.content ?? '')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZE)
  const width = Math.min(
    doc.getTextWidth(content) + ACTION_PADDING_X * 2,
    cell.width - 1
  )
  const height = Math.min(
    lineHeight(doc, FONT_SIZE) + OPTION_PADDING_Y * 2,
    cell.height - 1
  )

  drawMark(
    doc,
    cell.x + (cell.width - width) / 2,
    cell.y + (cell.height - height) / 2,
    width,
    height
  )
}

/**
 * Builds the portrait A4 report of a Critério de Prioridade, or its blank
 * form (FR-020, FR-021), in the order of the legacy
 * `prioritycriterion.pdf.twig`:
 *
 * 1. the title of the type and the code;
 * 2. the header: Data, Setor, Quantidade de funcionários, then Atividade,
 *    Área and Fábrica;
 * 3. the 5 questions, each with its options "( n ) rótulo" side by side,
 *    the chosen one in the legacy pink rounded border;
 * 4. "Soma = n", on the right;
 * 5. the ruler: the bands in the legacy colors, the numbers 1 to 8 and
 *    "9 – 10", and the actions, the one of the priority in the pink border;
 * 6. "Categorias de prioridades": Categoria | descrição | Ações, each
 *    solution with its line breaks;
 * 7. "Avaliador:" with the name and "Assinatura:" with a blank line.
 *
 * The sum and the priority are the API's `priority`, never recomputed here.
 * Options that do not fit a line wrap inside their question; a question
 * moves whole to the next page. A category row moves whole to the next page
 * unless it is taller than a page. The blank form has no code, no mark and
 * no value, "Soma = ____", header cells and solutions high enough to write
 * on (each solution at least 3 lines). Uses jsPDF's Helvetica (WinAnsi),
 * which covers every label of pt-BR, en and es (NFR-007).
 */
export function buildPriorityCriterionPdf({
  record,
  labels,
}: BuildPriorityCriterionPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2
  const bottom = pageHeight - MARGIN

  /** Column widths in millimeters from the legacy `<COL WIDTH>`. */
  function widths(columns: number[]) {
    const total = columns.reduce((sum, width) => sum + width, 0)
    return columns.map((width) => (contentWidth * width) / total)
  }

  doc.setProperties({
    title: record ? `${labels.title} ${record.code}` : labels.title,
  })

  // 1. The title and the code.
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

  const cellStyles = {
    font: 'helvetica',
    fontSize: FONT_SIZE,
    textColor: TEXT,
    fillColor: WHITE,
    lineColor: BORDER,
    lineWidth: LINE_WIDTH,
    cellPadding: PADDING,
    valign: 'middle',
    overflow: 'linebreak',
  } as const

  const base: UserOptions = {
    theme: 'grid',
    margin: MARGINS,
    styles: cellStyles,
    headStyles: { ...cellStyles, fontStyle: 'bold', halign: 'center' },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  }

  let cursor = MARGIN + TITLE_HEIGHT

  /** Starts a new page when `height` does not fit below the cursor. */
  function ensureRoom(height: number) {
    if (cursor + height > bottom && height <= bottom - MARGIN) {
      doc.addPage()
      cursor = MARGIN
    }
  }

  /**
   * The height of the header and the first row, measured on a scratch
   * document: jspdf-autotable only checks that the header fits before
   * starting, which can leave a header alone at the foot of a page.
   */
  function headAndFirstRowHeight(options: UserOptions) {
    const scratch = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    let end = MARGIN

    autoTable(scratch, {
      ...base,
      ...options,
      startY: MARGIN,
      body: options.body?.slice(0, 1),
      didDrawCell: undefined,
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    return scratch.getNumberOfPages() > 1
      ? Number.POSITIVE_INFINITY
      : end - MARGIN
  }

  function table(options: UserOptions, gap = GAP) {
    const needed = headAndFirstRowHeight(options)
    if (Number.isFinite(needed)) ensureRoom(needed)

    let end = cursor

    autoTable(doc, {
      ...base,
      startY: cursor,
      ...options,
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    cursor = end + gap
  }

  // 2. The header: a bold label beside each value.
  const [dateWidth, sectorWidth, employeesWidth] = HEADER_LABEL_WIDTHS
  const valueWidth =
    (contentWidth - dateWidth - sectorWidth - employeesWidth) / 3
  const label = (content: string): CellDef => ({
    content: `${content}:`,
    styles: { fontStyle: 'bold' },
  })
  const value = (content: string | undefined): CellDef => ({
    content: text(content),
    styles: record ? {} : { minCellHeight: BLANK_HEADER_HEIGHT },
  })

  table({
    body: [
      [
        label(labels.fields.date),
        value(record?.date),
        label(labels.fields.sector),
        value(record?.sector),
        label(labels.fields.numberOfEmployees),
        value(record?.numberOfEmployees),
      ],
      [
        label(labels.fields.activity),
        value(record?.activity),
        label(labels.fields.area),
        value(record?.area),
        label(labels.fields.fabric),
        value(record?.fabric),
      ],
    ],
    columnStyles: {
      0: { cellWidth: dateWidth },
      1: { cellWidth: valueWidth },
      2: { cellWidth: sectorWidth },
      3: { cellWidth: valueWidth },
      4: { cellWidth: employeesWidth },
      5: { cellWidth: valueWidth },
    },
  })

  // 3. The questions: the text in bold, then the options centered, wrapping
  // to more lines when they do not fit one.
  const questionLine = lineHeight(doc, QUESTION_FONT_SIZE)
  const optionHeight = questionLine + OPTION_PADDING_Y * 2

  for (const question of PRIORITY_CRITERION_QUESTIONS) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(QUESTION_FONT_SIZE)
    const questionLines: string[] = doc.splitTextToSize(
      labels.questions[question.field],
      contentWidth
    )

    doc.setFont('helvetica', 'normal')
    const answer = record?.answers[question.field] ?? null
    const options = question.options.map(({ points, key }) => {
      const content = `( ${points} ) ${labels.options[key]}`
      return {
        content,
        width: Math.min(
          doc.getTextWidth(content) + OPTION_PADDING_X * 2,
          contentWidth
        ),
        marked: answer !== null && answer === points,
      }
    })

    const optionLines: (typeof options)[] = []
    for (const option of options) {
      const line = optionLines.at(-1)
      const used = line
        ? line.reduce((sum, { width }) => sum + width + OPTION_GAP, 0)
        : 0
      if (line && used + option.width <= contentWidth) line.push(option)
      else optionLines.push([option])
    }

    ensureRoom(
      questionLines.length * questionLine +
        QUESTION_GAP +
        optionLines.length * optionHeight
    )

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT)
    doc.text(questionLines, MARGIN, cursor, { baseline: 'top' })
    cursor += questionLines.length * questionLine + QUESTION_GAP

    doc.setFont('helvetica', 'normal')
    for (const line of optionLines) {
      const lineWidth =
        line.reduce((sum, { width }) => sum + width, 0) +
        OPTION_GAP * (line.length - 1)
      let x = MARGIN + (contentWidth - lineWidth) / 2

      for (const option of line) {
        doc.setTextColor(TEXT)
        doc.text(
          option.content,
          x + OPTION_PADDING_X,
          cursor + OPTION_PADDING_Y,
          // Only a label wider than the whole line wraps (it is never cut).
          { baseline: 'top', maxWidth: contentWidth - OPTION_PADDING_X * 2 }
        )
        if (option.marked) drawMark(doc, x, cursor, option.width, optionHeight)
        x += option.width + OPTION_GAP
      }
      cursor += optionHeight
    }
    cursor += QUESTION_SPACING
  }

  // 4. "Soma = n" on the right, blank to be filled by hand.
  const sum = record ? String(record.priority.sum) : '____'
  ensureRoom(questionLine)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(QUESTION_FONT_SIZE)
  doc.setTextColor(TEXT)
  doc.text(`${labels.sum} = ${sum}`, pageWidth - MARGIN, cursor, {
    align: 'right',
    baseline: 'top',
  })
  cursor += questionLine + GAP

  // 5. The ruler: the bands, their numbers and their actions; the action of
  // the priority in the pink border. Kept on one page.
  const rulerColumns = PRIORITY_CRITERION_BANDS.flatMap(({ ruler }) => ruler)
  const rulerWidth = contentWidth / rulerColumns.length
  const rulerRowHeight = lineHeight(doc, FONT_SIZE) + PADDING * 2
  const level = record?.priority.level ?? null

  ensureRoom(rulerRowHeight * 3 + OPTION_PADDING_Y * 2)
  table({
    body: [
      PRIORITY_CRITERION_BANDS.map(
        (band): CellDef => ({
          content: labels.levels[band.level].priority.toUpperCase(),
          colSpan: band.ruler.length,
          styles: {
            fillColor: band.color,
            textColor: band.textColor,
            fontSize: BAND_FONT_SIZE,
            halign: 'center',
          },
        })
      ),
      rulerColumns.map(
        (number): CellDef => ({
          content: number,
          styles: { halign: 'center' },
        })
      ),
      PRIORITY_CRITERION_BANDS.map(
        (band): ActionCell => ({
          content: labels.levels[band.level].action.toUpperCase(),
          colSpan: band.ruler.length,
          marked: band.level === level,
          styles: {
            halign: 'center',
            cellPadding: PADDING + OPTION_PADDING_Y,
          },
        })
      ),
    ],
    columnStyles: Object.fromEntries(
      rulerColumns.map((_, i) => [i, { cellWidth: rulerWidth }])
    ),
    rowPageBreak: 'avoid',
    didDrawCell: (data) => drawActionMark(doc, data),
  })

  // 6. "Categorias de prioridades": the number and the category, then the
  // solution with its line breaks. The title is part of the header, so it
  // never stays alone and repeats on each page.
  const [numberWidth, descriptionWidth, solutionWidth] =
    widths(CATEGORY_COLUMNS)
  const blankSolutionHeight = lineHeight(doc, FONT_SIZE) * 3 + PADDING * 2
  const head: RowInput[] = [
    [
      {
        content: `${labels.categoriesTitle}:`,
        colSpan: 3,
        styles: {
          fontStyle: 'normal',
          halign: 'left',
          lineWidth: 0,
          fontSize: QUESTION_FONT_SIZE,
        },
      },
    ],
    [{ content: labels.category, colSpan: 2 }, labels.actions],
  ]

  table({
    head,
    body: PRIORITY_CRITERION_CATEGORIES.map(({ number, answer }, i) => [
      {
        content: String(number),
        styles: { fontStyle: 'bold', halign: 'center' },
      },
      { content: labels.categories[answer], styles: { halign: 'center' } },
      {
        content: text(record?.solutions[answer]),
        styles: {
          valign: 'top',
          minCellHeight: record
            ? CATEGORY_MIN_HEIGHTS[i]
            : Math.max(CATEGORY_MIN_HEIGHTS[i], blankSolutionHeight),
        },
      },
    ]),
    columnStyles: {
      0: { cellWidth: numberWidth },
      1: { cellWidth: descriptionWidth },
      2: { cellWidth: solutionWidth },
    },
  })

  // 7. "Avaliador:" with the name over a line and "Assinatura:" with a
  // blank line, as the legacy foot.
  const [valuerLabelWidth, valuerWidth, signatureLabelWidth, signatureWidth] =
    widths(FOOT_COLUMNS)
  doc.setFontSize(QUESTION_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  const valuerLines: string[] = doc.splitTextToSize(
    text(record?.responsible),
    valuerWidth - PADDING * 2
  )
  const footHeight = Math.max(
    FOOT_HEIGHT,
    valuerLines.length * questionLine + PADDING * 2
  )
  ensureRoom(footHeight)

  const lineY = cursor + footHeight
  const valuerX = MARGIN + valuerLabelWidth
  const signatureLabelX = valuerX + valuerWidth + PADDING * 2
  const signatureX = signatureLabelX + signatureLabelWidth

  doc.setTextColor(TEXT)
  doc.text(`${labels.valuer}:`, MARGIN, lineY - PADDING, {
    baseline: 'bottom',
  })
  if (record) {
    doc.text(
      valuerLines,
      valuerX + PADDING,
      lineY - PADDING - (valuerLines.length - 1) * questionLine,
      { baseline: 'bottom' }
    )
  }
  doc.text(`${labels.signature}:`, signatureLabelX, lineY - PADDING, {
    baseline: 'bottom',
  })

  doc.setDrawColor(BORDER)
  doc.setLineWidth(LINE_WIDTH)
  doc.line(valuerX, lineY, valuerX + valuerWidth, lineY)
  doc.line(
    signatureX,
    lineY,
    Math.min(signatureX + signatureWidth, pageWidth - MARGIN),
    lineY
  )

  return doc.output('blob')
}
