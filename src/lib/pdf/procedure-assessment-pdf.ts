import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  PROCEDURE_ASSESSMENT_OPTIONS,
  PROCEDURE_ASSESSMENT_QUESTIONS,
  type ProcedureAssessmentAnswer,
  type ProcedureAssessmentCommentKey,
  type ProcedureAssessmentQuestionField,
} from '@/app/(app)/avaliacoes/components/procedure-assessment-questions'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface ProcedureAssessmentPdfLabels {
  /** The type: "Avaliação de Risco Ergonômico de Tarefas". */
  title: string
  /** The header (`evaluations.pdf.procedureAssessment.fields`). */
  fields: {
    activity: string
    date: string
    area: string
    fabric: string
    sector: string
    valuer: string
    ratedTurn: string
  }
  /** The table (`evaluations.pdf.procedureAssessment.columns`). */
  columns: {
    number: string
    question: string
    answer: string
    comments: string
  }
  /** The 5 questions (`…procedureAssessmentQuestions.questions`). */
  questions: Record<ProcedureAssessmentQuestionField, string>
  /** The labels of the comments (`…procedureAssessmentQuestions.comments`). */
  commentLabels: Record<ProcedureAssessmentCommentKey, string>
  /** "Sim" and "Não" (`…procedureAssessmentQuestions.options`). */
  options: Record<ProcedureAssessmentAnswer, string>
}

/** An Avaliação de Risco Ergonômico de Tarefas, already formatted. */
export interface ProcedureAssessmentPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  /** The current area and fabric of the activity (R-6). */
  area: string
  fabric: string
  sector: string
  valuer: string
  ratedTurn: string
  answers: Record<ProcedureAssessmentQuestionField, ProcedureAssessmentAnswer>
  /** As typed, with their line breaks; `null` or `''` when blank. */
  comments: Record<ProcedureAssessmentCommentKey, string | null>
}

export interface BuildProcedureAssessmentPdfInput {
  /** The record, or `null` for the blank form (FR-018). */
  record: ProcedureAssessmentPdfRecord | null
  labels: ProcedureAssessmentPdfLabels
}

// Black on white with thin black borders, as the legacy report; the chosen
// answer has the pink rounded border of the legacy `span.selected` (2 px
// `#E91E63`, 5 px radius).
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
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2
/** The room between the title and the code, and below the title. */
const TITLE_GAP = 5
/** The legacy `<br>` between the header and the table. */
const GAP = 8

const TITLE_FONT_SIZE = 15
const FONT_SIZE = 9
/** How far below the top of its line autotable sets a line's baseline. */
const BASELINE_RATIO = 0.85

const MARK_WIDTH = px(2)
const MARK_RADIUS = px(5)
/** Room between an answer's text and its border. */
const OPTION_PADDING_X = 2
const OPTION_PADDING_Y = 0.8
/** The legacy `<br>` between "Sim" and "Não". */
const OPTION_GAP = 3

/** The legacy `<COL WIDTH>` of the header. */
const HEADER_COLUMNS = [239, 143, 191]
/** The legacy cells have only horizontal rules and no side padding. */
const HEADER_PADDING = { top: 1.5, bottom: 1.5, left: 0, right: 2 }
/** A cell of the blank header: room to write by hand. */
const BLANK_HEADER_HEIGHT = 9

/** The legacy `<COL WIDTH>` of the table. */
const QUESTION_COLUMNS = [57, 231, 64, 210]
const ANSWER_COLUMN = 2
const COMMENT_COLUMN = 3
/** The legacy `HEIGHT` of each question, in its order. */
const QUESTION_MIN_HEIGHTS = [110, 90, 90, 90, 89].map(px)
/** A question of the blank form: room to write the comment by hand. */
const BLANK_QUESTION_HEIGHT = 38

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

/**
 * Builds the portrait A4 report of an Avaliação de Risco Ergonômico de
 * Tarefas, or its blank form (FR-017, FR-018), in the order of the legacy
 * `procedureassessment.pdf.twig`:
 *
 * 1. the title of the type and the code; a title that does not fit wraps
 *    before reaching the code;
 * 2. the header, with horizontal rules only: Atividade and Data; Área,
 *    Fábrica (the cell the legacy left empty) and Setor; Avaliador and Turno
 *    avaliado;
 * 3. the table Número, Pergunta, Resposta and Comentários: "Sim" and "Não"
 *    one above the other, the chosen one in the legacy pink rounded border;
 *    the comment with its label in bold and the text below, keeping its line
 *    breaks.
 *
 * Nothing else is marked, and no answer shows points (R-11). Each question is
 * drawn as its own table, right below the previous one, so it moves whole to
 * the next page with the columns on top, and only one taller than a page is
 * split: it then starts on a page of its own (or under the header) and the
 * comment continues on the next ones, never cut. The blank form has no code,
 * no mark and no value, with rows high enough to write on. Uses jsPDF's
 * Helvetica (WinAnsi), which covers every label of pt-BR, en and es (NFR-007).
 */
export function buildProcedureAssessmentPdf({
  record,
  labels,
}: BuildProcedureAssessmentPdfInput): Blob {
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
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setTextColor(TEXT)
  const titleLines: string[] = doc.splitTextToSize(
    labels.title,
    record
      ? contentWidth - doc.getTextWidth(record.code) - TITLE_GAP
      : contentWidth
  )
  doc.text(titleLines, MARGIN, MARGIN, { baseline: 'top' })
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
      overflow: 'linebreak',
    },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  }

  let cursor =
    MARGIN + titleLines.length * lineHeight(doc, TITLE_FONT_SIZE) + TITLE_GAP

  /**
   * The height of a table, measured on a scratch document, or infinite when
   * it does not fit a whole page.
   */
  function measure(options: UserOptions) {
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
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    return scratch.getNumberOfPages() > 1
      ? Number.POSITIVE_INFINITY
      : end - MARGIN
  }

  function table(options: UserOptions, gap = 0) {
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

  // 2. The header: "label: value" in cells with horizontal rules only.
  const headerCell = (
    label: string,
    value: string | undefined,
    colSpan = 1
  ): CellDef => ({
    content: record ? `${label}: ${text(value)}` : `${label}:`,
    colSpan,
    styles: {
      valign: 'top',
      cellPadding: HEADER_PADDING,
      lineWidth: { top: LINE_WIDTH, bottom: LINE_WIDTH },
      ...(record ? {} : { minCellHeight: BLANK_HEADER_HEIGHT }),
    },
  })
  const [areaWidth, fabricWidth, sectorWidth] = widths(HEADER_COLUMNS)

  table(
    {
      body: [
        [
          headerCell(labels.fields.activity, record?.activity, 2),
          headerCell(labels.fields.date, record?.date),
        ],
        [
          headerCell(labels.fields.area, record?.area),
          headerCell(labels.fields.fabric, record?.fabric),
          headerCell(labels.fields.sector, record?.sector),
        ],
        [
          headerCell(labels.fields.valuer, record?.valuer, 2),
          headerCell(labels.fields.ratedTurn, record?.ratedTurn),
        ],
      ],
      columnStyles: {
        0: { cellWidth: areaWidth },
        1: { cellWidth: fabricWidth },
        2: { cellWidth: sectorWidth },
      },
    },
    GAP
  )

  // 3. The table of the questions.
  const [numberWidth, questionWidth, answerWidth, commentWidth] =
    widths(QUESTION_COLUMNS)
  const columnStyles: UserOptions['columnStyles'] = {
    0: { cellWidth: numberWidth, halign: 'center', valign: 'middle' },
    1: { cellWidth: questionWidth, halign: 'center', valign: 'middle' },
    2: { cellWidth: answerWidth },
    3: { cellWidth: commentWidth, halign: 'left', valign: 'top' },
  }
  const head: RowInput[] = [
    [
      labels.columns.number,
      labels.columns.question,
      labels.columns.answer,
      labels.columns.comments,
    ],
  ]
  const headStyles: UserOptions['headStyles'] = {
    fontStyle: 'bold',
    halign: 'center',
    valign: 'middle',
  }
  const line = lineHeight(doc, FONT_SIZE)
  const optionHeight = line + OPTION_PADDING_Y * 2

  /** "Sim" and "Não", centered in the cell, the chosen one marked. */
  function drawAnswers(
    { cell }: CellHookData,
    answer: ProcedureAssessmentAnswer | undefined
  ) {
    const center = cell.x + cell.width / 2
    let y =
      cell.y +
      (cell.height -
        (optionHeight * PROCEDURE_ASSESSMENT_OPTIONS.length +
          OPTION_GAP * (PROCEDURE_ASSESSMENT_OPTIONS.length - 1))) /
        2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(FONT_SIZE)
    for (const { value } of PROCEDURE_ASSESSMENT_OPTIONS) {
      const label = labels.options[value]
      doc.setTextColor(TEXT)
      doc.text(label, center, y + OPTION_PADDING_Y, {
        align: 'center',
        baseline: 'top',
      })
      if (answer === value) {
        const width = doc.getTextWidth(label) + OPTION_PADDING_X * 2
        drawMark(doc, center - width / 2, y, width, optionHeight)
      }
      y += optionHeight + OPTION_GAP
    }
  }

  PROCEDURE_ASSESSMENT_QUESTIONS.forEach(
    ({ field, commentKey }, questionIndex) => {
      // Wrapped in bold here: autotable lays it out in the narrower regular
      // font, so it keeps these lines and reserves their room in the cell.
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(FONT_SIZE)
      const commentLabel: string[] = doc.splitTextToSize(
        labels.commentLabels[commentKey],
        commentWidth - PADDING * 2
      )
      const comment = text(record?.comments[commentKey])
      const body: RowInput[] = [
        [
          String(questionIndex + 1),
          labels.questions[field],
          '',
          {
            content: [...commentLabel, ...(comment ? [comment] : [])].join(
              '\n'
            ),
            styles: {
              minCellHeight: record
                ? QUESTION_MIN_HEIGHTS[questionIndex]
                : BLANK_QUESTION_HEIGHT,
            },
          },
        ],
      ]
      const withHead = { head, headStyles, body, columnStyles }
      const withoutHead = { body, columnStyles }

      // The columns start the table and each new page, and repeat on the
      // pages of a question taller than a page.
      const tall = !Number.isFinite(measure(withHead))
      let showColumns = questionIndex === 0 || tall
      const startsPage = tall
        ? questionIndex > 0
        : cursor + measure(showColumns ? withHead : withoutHead) > bottom
      if (startsPage) {
        doc.addPage()
        cursor = MARGIN
        showColumns = true
      }

      let labelLinesLeft = commentLabel.length
      let labelLines: string[] = []
      let answersDrawn = false

      table({
        ...(showColumns ? withHead : withoutHead),
        // The label is drawn in bold over the room left for it, on the slice
        // of the row that holds it.
        willDrawCell: (data) => {
          if (data.section !== 'body' || data.column.index !== COMMENT_COLUMN) {
            return
          }
          const count = Math.min(labelLinesLeft, data.cell.text.length)
          labelLines = data.cell.text.slice(0, count)
          labelLinesLeft -= count
          data.cell.text = [
            ...labelLines.map(() => ''),
            ...data.cell.text.slice(count),
          ]
        },
        didDrawCell: (data) => {
          if (data.section !== 'body') return

          if (data.column.index === ANSWER_COLUMN && !answersDrawn) {
            answersDrawn = true
            drawAnswers(data, record?.answers[field])
          }
          if (data.column.index === COMMENT_COLUMN) {
            const { cell } = data
            const baseline =
              cell.y + PADDING + (FONT_SIZE * BASELINE_RATIO * 25.4) / 72
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(FONT_SIZE)
            doc.setTextColor(TEXT)
            labelLines.forEach((content, i) => {
              doc.text(content, cell.x + cell.width / 2, baseline + i * line, {
                align: 'center',
              })
            })
          }
        },
      })
    }
  )

  return doc.output('blob')
}
