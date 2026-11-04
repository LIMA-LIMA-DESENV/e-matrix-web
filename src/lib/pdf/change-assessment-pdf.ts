import { jsPDF } from 'jspdf'
import { autoTable, type UserOptions } from 'jspdf-autotable'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface ChangeAssessmentPdfLabels {
  /** The type: "Avaliação de Mudanças / Projetos". */
  title: string
  /** "Atividade". */
  activity: string
  /** "Data". */
  date: string
  /** The 8 questions, in the order of the legacy form. */
  questions: string[]
}

/** An Avaliação de Mudanças / Projetos, already formatted. */
export interface ChangeAssessmentPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  /** One per question, in the same order; `''` when not answered. */
  answers: string[]
}

export interface BuildChangeAssessmentPdfInput {
  /** The record, or `null` for the blank form (FR-017). */
  record: ChangeAssessmentPdfRecord | null
  labels: ChangeAssessmentPdfLabels
}

// The legacy report is black on white, each cell with a 1px black border.
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 2
const TITLE_HEIGHT = 12
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2

const FONT_SIZE = 10

/** The "N )" column of a question. */
const NUMBER_WIDTH = 9

/** The legacy `td height="80"`: 80 CSS px, at 96 px per inch. */
const ANSWER_MIN_HEIGHT = (80 * 25.4) / 96

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, '\n')
}

/**
 * Builds the portrait A4 report of an Avaliação de Mudanças / Projetos, or
 * its blank form (FR-016, FR-017), as the legacy `changeassessment.pdf.twig`:
 * the title of the type and the code; one bordered line with "Atividade:"
 * and, on the right, "Data:"; then each of the 8 questions in a bordered line
 * numbered "N )", followed by a bordered answer cell at least as high as the
 * legacy 80 px, with the answer's line breaks kept. A question and its answer
 * start a new page rather than being split, unless they are taller than a
 * page; then the answer breaks inside its cell. Every value is printed as
 * text (D-4), with jsPDF's Helvetica, which covers the accents of pt-BR and es
 * (NFR-005).
 */
export function buildChangeAssessmentPdf({
  record,
  labels,
}: BuildChangeAssessmentPdfInput): Blob {
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
      lineWidth: LINE_WIDTH,
      cellPadding: PADDING,
      valign: 'top',
      overflow: 'linebreak',
    },
    // The question and its answer move to the next page together; a row
    // taller than a page is still split, so no text is cut.
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
  }

  let cursor = MARGIN + TITLE_HEIGHT

  // Each table starts right below the previous one, on the page it ended:
  // the legacy report is one table, its rows touching.
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

  // One line, "Atividade:" on the left and "Data:" on the right, drawn as a
  // single bordered cell: the border between the two halves is hidden.
  table({
    body: [
      [
        {
          content: `${labels.activity}: ${record?.activity ?? ''}`,
          styles: {
            lineWidth: {
              top: LINE_WIDTH,
              bottom: LINE_WIDTH,
              left: LINE_WIDTH,
            },
          },
        },
        {
          content: `${labels.date}: ${record?.date ?? ''}`,
          styles: {
            halign: 'right',
            lineWidth: {
              top: LINE_WIDTH,
              bottom: LINE_WIDTH,
              right: LINE_WIDTH,
            },
          },
        },
      ],
    ],
    columnStyles: { 1: { cellWidth: contentWidth * 0.35 } },
  })

  // Each question: "N )" in bold beside its text, in one bordered line, then
  // the answer cell.
  labels.questions.forEach((question, i) => {
    const answer = normalizeLineBreaks(record?.answers[i] ?? '')

    table({
      body: [
        [
          {
            content: `${i + 1} )`,
            styles: {
              fontStyle: 'bold',
              lineWidth: {
                top: LINE_WIDTH,
                bottom: LINE_WIDTH,
                left: LINE_WIDTH,
              },
            },
          },
          {
            content: question,
            styles: {
              lineWidth: {
                top: LINE_WIDTH,
                bottom: LINE_WIDTH,
                right: LINE_WIDTH,
              },
            },
          },
        ],
        [
          {
            content: answer,
            colSpan: 2,
            styles: { minCellHeight: ANSWER_MIN_HEIGHT },
          },
        ],
      ],
      columnStyles: { 0: { cellWidth: NUMBER_WIDTH } },
    })
  })

  return doc.output('blob')
}
