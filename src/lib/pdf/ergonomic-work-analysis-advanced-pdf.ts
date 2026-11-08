import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA,
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS,
  type ErgonomicWorkAnalysisAdvancedColumn,
  type ErgonomicWorkAnalysisAdvancedComplementaryData,
  type ErgonomicWorkAnalysisAdvancedRow,
  type ErgonomicWorkAnalysisAdvancedTable,
  type ErgonomicWorkAnalysisAdvancedTextAnswer,
} from '@/app/(app)/avaliacoes/components/ergonomic-work-analysis-advanced-fields'
import type { PdfPhoto } from './load-photo'

/** The translated title and column headers of a table of the report. */
export interface ErgonomicWorkAnalysisAdvancedPdfTableLabels<
  T extends ErgonomicWorkAnalysisAdvancedTable,
> {
  /** "Dados da Atividade" or "Tabela de Análise Ergonômica Avançada". */
  title: string
  columns: Record<ErgonomicWorkAnalysisAdvancedColumn<T>, string>
}

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface ErgonomicWorkAnalysisAdvancedPdfLabels {
  /** The type: "Análise Ergonômica do Trabalho – Produção". */
  title: string
  /** "Atividade". */
  activity: string
  /** "Data". */
  date: string
  /** "IMAGEM DO SETOR". */
  photo: string
  /** "Foto indisponível", for a photo that did not load. */
  photoUnavailable: string
  /** "DESCRIÇÃO DA TAREFA". */
  description: string
  tables: {
    [T in ErgonomicWorkAnalysisAdvancedTable]: ErgonomicWorkAnalysisAdvancedPdfTableLabels<T>
  }
  /** "DADOS COMPLEMENTARES". */
  complementaryDataTitle: string
  /** The 7 legacy labels of the complementary data. */
  complementaryData: Record<
    ErgonomicWorkAnalysisAdvancedComplementaryData,
    string
  >
  /** "RESULTADOS E CONCLUSÕES". */
  resultsAndConclusions: string
  /** "RECOMENDAÇÕES". */
  recomendations: string
}

/** The answers, `''` or `null` when blank; a table may have no rows. */
export type ErgonomicWorkAnalysisAdvancedPdfAnswers = Record<
  ErgonomicWorkAnalysisAdvancedTextAnswer,
  string | null
> & {
  [T in ErgonomicWorkAnalysisAdvancedTable]: ErgonomicWorkAnalysisAdvancedRow<T>[]
}

/** An Análise Ergonômica do Trabalho – Produção, already formatted. */
export interface ErgonomicWorkAnalysisAdvancedPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  answers: ErgonomicWorkAnalysisAdvancedPdfAnswers
  /**
   * The sector photo through `loadPdfPhoto`, `UNAVAILABLE_PHOTO` when it did
   * not download or decode, or `null` when the record has none.
   */
  photo: PdfPhoto | null
}

export interface BuildErgonomicWorkAnalysisAdvancedPdfInput {
  /** The record, or `null` for the blank form (FR-027). */
  record: ErgonomicWorkAnalysisAdvancedPdfRecord | null
  labels: ErgonomicWorkAnalysisAdvancedPdfLabels
}

// Black on white, each cell with a thin black border.
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 2
const TITLE_HEIGHT = 12
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2
/** The legacy `<br>` between the tables. */
const GAP = 5

const FONT_SIZE = 10

/** CSS px of the legacy report, at 96 px per inch. */
function px(value: number) {
  return (value * 25.4) / 96
}

/** The legacy `HEIGHT=50` of each row of the two tables. */
const ROW_MIN_HEIGHT = px(50)
/** The legacy `HEIGHT=45` of "RESULTADOS E CONCLUSÕES". */
const RESULT_MIN_HEIGHT = px(45)
/** The photo cell: at least this high, and on the blank form (FR-027). */
const PHOTO_MIN_HEIGHT = 60
/** A portrait photo grows the cell up to this height, not further. */
const PHOTO_MAX_HEIGHT = 110

// The legacy `<COL WIDTH>` of each table, as fractions of the page width.
const PHOTO_COLUMNS = [288, 408]
const TABLE_COLUMNS: {
  [T in ErgonomicWorkAnalysisAdvancedTable]: number[]
} = {
  steps: [273, 103, 288],
  analyzedActivities: [231, 96, 135, 192],
}
const COMPLEMENTARY_COLUMNS = [274, 402]
const RESULT_COLUMNS = [160, 538]

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function text(value: string | null | undefined) {
  return (value ?? '').replace(/\r\n?/g, '\n')
}

/** The photo cell, told apart from the others by `photo`. */
interface PhotoCell extends CellDef {
  photo: PdfPhoto | null
}

/**
 * Builds the portrait A4 report of an Análise Ergonômica do Trabalho –
 * Produção, or its blank form (FR-026, FR-027), black on white, in the order
 * of the legacy `ergonomicworkanalysisadvanced.pdf.twig`: the title of the
 * type and the code; "Atividade:" and, on the right, "Data:"; the sector photo
 * beside the task description; "Dados da Atividade" with the process steps;
 * the "Tabela de Análise Ergonômica Avançada" with the analyzed activities;
 * the 7 complementary data, label beside text; and the results and
 * conclusions with the recommendations.
 *
 * The photo fills its cell keeping its aspect ratio; with no photo the cell is
 * empty, and an unavailable one shows the notice instead. A table without
 * rows gets one empty row. A table that does not fit continues on the next
 * page with its header repeated, and a row moves whole to the next page unless
 * it is taller than a page. Texts keep their line breaks. The blank form has
 * no code, photo or value, with a photo cell of at least 60 mm and every text
 * cell at least 3 lines high, to be filled by hand. Uses jsPDF's Helvetica
 * (WinAnsi), which covers every label of pt-BR, en and es (NFR-008).
 */
export function buildErgonomicWorkAnalysisAdvancedPdf({
  record,
  labels,
}: BuildErgonomicWorkAnalysisAdvancedPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2

  /** Column widths in millimeters from the legacy `<COL WIDTH>`. */
  function widths(columns: number[]) {
    const total = columns.reduce((sum, width) => sum + width, 0)
    return Object.fromEntries(
      columns.map((width, i) => [
        i,
        { cellWidth: (contentWidth * width) / total },
      ])
    )
  }

  // Three lines of text plus the padding: room to write by hand.
  const lineHeight =
    (FONT_SIZE * doc.getLineHeightFactor()) / doc.internal.scaleFactor
  const blankTextHeight = lineHeight * 3 + PADDING * 2
  const textHeight = (filled: number) =>
    record ? filled : Math.max(filled, blankTextHeight)

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

  const cellStyles = {
    font: 'helvetica',
    fontSize: FONT_SIZE,
    textColor: TEXT,
    fillColor: WHITE,
    lineColor: BORDER,
    lineWidth: LINE_WIDTH,
    cellPadding: PADDING,
    valign: 'top',
    overflow: 'linebreak',
  } as const

  const base: UserOptions = {
    theme: 'grid',
    margin: MARGINS,
    styles: cellStyles,
    headStyles: { ...cellStyles, fontStyle: 'bold', halign: 'center' },
    // A table continues on the next page with its header; a row moves whole,
    // unless it is taller than a page, so no text is cut.
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  }

  let cursor = MARGIN + TITLE_HEIGHT
  const pageHeight = doc.internal.pageSize.getHeight()

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
    // A table starts on the next page when its header and first row do not
    // fit, unless they are taller than a page anyway.
    const needed = headAndFirstRowHeight(options)
    if (Number.isFinite(needed) && cursor + needed > pageHeight - MARGIN) {
      doc.addPage()
      cursor = MARGIN
    }

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

  /** The legacy title above a table, part of its header so it never stays alone. */
  function titleRow(title: string, colSpan: number): RowInput {
    return [
      {
        content: `${title}:`,
        colSpan,
        styles: { fontStyle: 'normal', halign: 'left', lineWidth: 0 },
      },
    ]
  }

  // "Atividade:" on the left and "Data:" on the right, without borders.
  table(
    {
      body: [
        [
          `${labels.activity}: ${record?.activity ?? ''}`,
          {
            content: `${labels.date}: ${record?.date ?? ''}`,
            styles: { halign: 'right' },
          },
        ],
      ],
      styles: { ...cellStyles, lineWidth: 0 },
      columnStyles: { 1: { cellWidth: contentWidth * 0.35 } },
    },
    2
  )

  // The sector photo beside the task description.
  const photo = record?.photo ?? null
  const photoWidth =
    (contentWidth * PHOTO_COLUMNS[0]) / (PHOTO_COLUMNS[0] + PHOTO_COLUMNS[1]) -
    PADDING * 2
  const photoHeight =
    photo?.status === 'ready'
      ? Math.min(
          PHOTO_MAX_HEIGHT,
          Math.max(
            PHOTO_MIN_HEIGHT,
            (photoWidth * photo.height) / photo.width + PADDING * 2
          )
        )
      : PHOTO_MIN_HEIGHT
  const photoCell: PhotoCell = {
    content: '',
    photo,
    styles: { minCellHeight: photoHeight },
  }
  // A description taller than a page splits its row; the photo goes only on
  // the first part.
  let photoDrawn = false

  table({
    head: [[labels.photo, `${labels.description}:`]],
    body: [[photoCell, text(record?.answers.description)]],
    columnStyles: widths(PHOTO_COLUMNS),
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0 || photoDrawn) {
        return
      }
      photoDrawn = true
      drawPhoto(doc, data, labels.photoUnavailable)
    },
  })

  // "Dados da Atividade" and the "Tabela de Análise Ergonômica Avançada":
  // the rows saved, or one empty row.
  function rowsTable<T extends ErgonomicWorkAnalysisAdvancedTable>(name: T) {
    const columns = ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS[
      name
    ] as readonly ErgonomicWorkAnalysisAdvancedColumn<T>[]
    const tableLabels = labels.tables[
      name
    ] as ErgonomicWorkAnalysisAdvancedPdfTableLabels<T>
    const rows = (record?.answers[name] ??
      []) as ErgonomicWorkAnalysisAdvancedRow<T>[]
    const body = (rows.length > 0 ? rows : [null]).map((row) =>
      columns.map((column) => text(row?.[column]))
    )

    table({
      head: [
        titleRow(tableLabels.title, columns.length),
        columns.map((column) => tableLabels.columns[column]),
      ],
      body,
      columnStyles: widths(TABLE_COLUMNS[name]),
      bodyStyles: { minCellHeight: textHeight(ROW_MIN_HEIGHT) },
    })
  }

  rowsTable('steps')
  rowsTable('analyzedActivities')

  // "DADOS COMPLEMENTARES": the legacy label, in bold, beside its text.
  table({
    head: [[{ content: labels.complementaryDataTitle, colSpan: 2 }]],
    body: ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA.map((key) => [
      { content: labels.complementaryData[key], styles: { fontStyle: 'bold' } },
      text(record?.answers[key]),
    ]),
    columnStyles: widths(COMPLEMENTARY_COLUMNS),
    bodyStyles: { minCellHeight: textHeight(0) },
  })

  // "RESULTADOS E CONCLUSÕES" and "RECOMENDAÇÕES", label beside text.
  table(
    {
      body: (['resultsAndConclusions', 'recomendations'] as const).map(
        (key) => [
          {
            content: labels[key],
            styles: { fontStyle: 'bold', halign: 'center' },
          },
          {
            content: text(record?.answers[key]),
            styles: {
              minCellHeight: textHeight(
                key === 'resultsAndConclusions' ? RESULT_MIN_HEIGHT : 0
              ),
            },
          },
        ]
      ),
      columnStyles: widths(RESULT_COLUMNS),
    },
    0
  )

  return doc.output('blob')
}

/** Fits the photo in the cell keeping its aspect ratio, centered. */
function drawPhoto(doc: jsPDF, data: CellHookData, unavailable: string) {
  const { cell } = data
  const { photo } = cell.raw as Partial<PhotoCell>
  if (!photo) return

  const box = {
    x: cell.x + PADDING,
    y: cell.y + PADDING,
    width: cell.width - PADDING * 2,
    height: cell.height - PADDING * 2,
  }

  if (photo.status === 'unavailable') {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(FONT_SIZE)
    doc.setTextColor(TEXT)
    doc.text(unavailable, box.x + box.width / 2, box.y + box.height / 2, {
      align: 'center',
      baseline: 'middle',
    })
    return
  }

  const scale = Math.min(box.width / photo.width, box.height / photo.height)
  const width = photo.width * scale
  const height = photo.height * scale

  doc.addImage(
    photo.data,
    'JPEG',
    box.x + (box.width - width) / 2,
    box.y + (box.height - height) / 2,
    width,
    height
  )
}
