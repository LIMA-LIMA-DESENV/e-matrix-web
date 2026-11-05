import { jsPDF } from 'jspdf'
import { autoTable, type CellDef, type UserOptions } from 'jspdf-autotable'

/** The number of questions and of steps in the guide of question 8. */
const QUESTION_COUNT = 20
const PROCESS_STEP_COUNT = 5

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface ErgonomicAnalysisInLocoPdfLabels {
  /** The type, with its suffix: "Coleta de Dados In Loco — Produção". */
  title: string
  date: string
  shiftSchedules: string
  activity: string
  area: string
  fabric: string
  sector: string
  /** The label of the block of questions 5 to 7: "Tempos e ciclos". */
  timesAndCycles: string
  /** The 20 questions, in the order of the legacy report (R-7). */
  questions: string[]
  /** The 5 steps of the guide of question 8, in the legacy order. */
  processSteps: string[]
}

/** A Coleta de Dados In Loco — Produção, every value already formatted. */
export interface ErgonomicAnalysisInLocoPdfRecord {
  code: string
  /** Formatted in the user's locale. */
  date: string
  shiftSchedules: string
  /** `código — nome`. */
  activity: string
  /** The current area and fabric of the activity (R-6). */
  area: string
  fabric: string
  sector: string
  /**
   * One per question, in the order of `labels.questions`; `''` when not
   * answered. Question 5 comes in the user's number format.
   */
  answers: string[]
}

export interface BuildErgonomicAnalysisInLocoPdfInput {
  /** The record, or `null` for the blank form (FR-017). */
  record: ErgonomicAnalysisInLocoPdfRecord | null
  labels: ErgonomicAnalysisInLocoPdfLabels
}

// The legacy report is black on white, each cell with a 1px black border.
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 1.8
const TITLE_HEIGHT = 12
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2

const FONT_SIZE = 9

/** The legacy columns of the questions table, in its `<col width>` px. */
const LABEL_COLUMN = 159
const CONTENT_COLUMNS = [92, 91, 100, 86, 97]
/** The legacy label is 159 of the 665 px of the table (`td width`). */
const LABEL_SHARE = LABEL_COLUMN / 665

/** The legacy header widths: activity 351, area 383, fabric 259, sector 259. */
const HEADER_COLUMNS = [351, 383, 259, 259]

/** A cell to write on, as the legacy `td height="80"`: 80 CSS px at 96 dpi. */
const ANSWER_MIN_HEIGHT = (80 * 25.4) / 96
/** The process steps get twice as much room. */
const PROCESS_STEPS_MIN_HEIGHT = ANSWER_MIN_HEIGHT * 2
/** A header line: room for a value written by hand. */
const HEADER_MIN_HEIGHT = 9

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, '\n')
}

function scale(widths: number[], total: number) {
  const sum = widths.reduce((a, b) => a + b, 0)

  return widths.map((width) => (width * total) / sum)
}

function columnStyles(widths: number[]): UserOptions['columnStyles'] {
  return Object.fromEntries(
    widths.map((cellWidth, i) => [i, { cellWidth }])
  ) as UserOptions['columnStyles']
}

/**
 * Builds the portrait A4 report of a Coleta de Dados In Loco — Produção, or
 * its blank form (FR-016, FR-017), as the legacy
 * `ergonomicanalysisinloco.pdf.twig`: the title of the type and the code; the
 * header, [Data | Horário dos turnos] and [Atividade | Área | Fábrica |
 * Setor]; then the questions in a label column (159 of 665, as the legacy) and
 * five content columns: questions 1 and 2 share a line, 3 and 4 have one each,
 * "Tempos e ciclos" holds 5, 6 and 7 side by side, question 8 has the line of
 * its 5-step guide over its answer, and 9 to 20 have one line each.
 *
 * Every value is printed as text, with its line breaks, and an empty one is a
 * blank cell high enough to write on. A block starts a new page rather than
 * being split, unless it is taller than a page; then the answer breaks inside
 * its cell, so no text is cut. The text is in jsPDF's Helvetica (WinAnsi),
 * which covers the accents of pt-BR and es and the "—" (NFR-007).
 */
export function buildErgonomicAnalysisInLocoPdf({
  record,
  labels,
}: BuildErgonomicAnalysisInLocoPdfInput): Blob {
  if (labels.questions.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} questions.`)
  }
  if (labels.processSteps.length !== PROCESS_STEP_COUNT) {
    throw new Error(`Expected ${PROCESS_STEP_COUNT} process steps.`)
  }
  if (record && record.answers.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} answers.`)
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2

  const labelWidth = contentWidth * LABEL_SHARE
  const questionColumns = columnStyles([
    labelWidth,
    ...scale(CONTENT_COLUMNS, contentWidth - labelWidth),
  ])
  const headerColumns = columnStyles(scale(HEADER_COLUMNS, contentWidth))

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

  const base: UserOptions = {
    theme: 'grid',
    margin: MARGINS,
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
    // split from where it starts, inside its cells, so no text is cut.
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
  }

  let cursor = MARGIN + TITLE_HEIGHT

  // Each table starts right below the previous one, on the page it ended:
  // the legacy report is two tables, their rows touching.
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
    cursor = end
  }

  function answer(i: number) {
    return normalizeLineBreaks(record?.answers[i] ?? '')
  }

  function field(label: string, value: string | undefined): CellDef {
    return {
      content: `${label}: ${normalizeLineBreaks(value ?? '')}`,
      styles: { minCellHeight: HEADER_MIN_HEIGHT },
    }
  }

  function answerCell(
    i: number,
    colSpan: number,
    minCellHeight = ANSWER_MIN_HEIGHT
  ): CellDef {
    return { content: answer(i), colSpan, styles: { minCellHeight } }
  }

  /**
   * The left cell of a two-line block, shown as one cell: the border between
   * its two halves is hidden. Drawn without `rowSpan`, which jspdf-autotable
   * does not split across pages.
   */
  function mergedLabel(
    content: string,
    half: 'top' | 'bottom',
    bold = false
  ): CellDef {
    return {
      content,
      styles: {
        fontStyle: bold ? 'bold' : 'normal',
        lineWidth: {
          left: LINE_WIDTH,
          right: LINE_WIDTH,
          ...(half === 'top' ? { top: LINE_WIDTH } : { bottom: LINE_WIDTH }),
        },
      },
    }
  }

  /** A question with its label on the left and its answer on the right. */
  function questionLine(i: number) {
    table({
      body: [[labels.questions[i], answerCell(i, 5)]],
      columnStyles: questionColumns,
    })
  }

  // The header: [Data | Horário dos turnos], then [Atividade | Área |
  // Fábrica | Setor].
  table({
    body: [
      [
        field(labels.date, record?.date),
        { ...field(labels.shiftSchedules, record?.shiftSchedules), colSpan: 3 },
      ],
      [
        field(labels.activity, record?.activity),
        field(labels.area, record?.area),
        field(labels.fabric, record?.fabric),
        field(labels.sector, record?.sector),
      ],
    ],
    columnStyles: headerColumns,
  })

  // A gap between the two legacy tables.
  cursor += 3

  // Questions 1 and 2 share a line.
  table({
    body: [
      [
        labels.questions[0],
        answerCell(0, 2),
        labels.questions[1],
        answerCell(1, 2),
      ],
    ],
    columnStyles: questionColumns,
  })

  questionLine(2)
  questionLine(3)

  // "Tempos e ciclos": questions 5, 6 and 7 side by side, each in bold over
  // its answer, as the legacy cell. The two lines stay together, unless they
  // are taller than a page.
  table({
    pageBreak: 'avoid',
    body: [
      [
        mergedLabel(labels.timesAndCycles, 'top', true),
        { content: labels.questions[4], styles: { fontStyle: 'bold' } },
        { content: labels.questions[5], styles: { fontStyle: 'bold' } },
        {
          content: labels.questions[6],
          colSpan: 3,
          styles: { fontStyle: 'bold' },
        },
      ],
      [
        mergedLabel('', 'bottom'),
        answerCell(4, 1),
        answerCell(5, 1),
        answerCell(6, 3),
      ],
    ],
    columnStyles: questionColumns,
  })

  // Question 8: the line of its 5-step guide, then its answer, together as
  // the block above.
  table({
    pageBreak: 'avoid',
    body: [
      [
        mergedLabel(labels.questions[7], 'top'),
        ...labels.processSteps.map((step) => normalizeLineBreaks(step)),
      ],
      [mergedLabel('', 'bottom'), answerCell(7, 5, PROCESS_STEPS_MIN_HEIGHT)],
    ],
    columnStyles: questionColumns,
  })

  for (let i = 8; i < QUESTION_COUNT; i++) questionLine(i)

  return doc.output('blob')
}
