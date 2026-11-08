import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  ERGONOMIC_WORK_ANALYSIS_TABLES,
  type ErgonomicWorkAnalysisAnswer,
  type ErgonomicWorkAnalysisMeasure,
  type ErgonomicWorkAnalysisTable,
  type ErgonomicWorkAnalysisTableAnswer,
} from '@/app/(app)/avaliacoes/components/ergonomic-work-analysis-fields'
import type { PdfPhoto } from './load-photo'

/** The translated column headers of a table of the report. */
type ColumnLabels<T extends ErgonomicWorkAnalysisTable> = Record<
  ErgonomicWorkAnalysisTableAnswer<T>,
  string
>

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface ErgonomicWorkAnalysisPdfLabels {
  /** The type: "Análise Ergonômica do Trabalho – Escritório". */
  title: string
  /** "Dados da Atividade". */
  activity: string
  /** "Data". */
  date: string
  /** "Imagem do posto". */
  photo: string
  /** "Foto indisponível", for a photo that did not load. */
  photoUnavailable: string
  tables: {
    /** The legacy table has no title, only its headers. */
    workstation: { columns: ColumnLabels<'workstation'> }
    /** "Tabela de Análise Ergonômica Avançada" (H-7). */
    advancedAnalysis: {
      title: string
      columns: ColumnLabels<'advancedAnalysis'>
    }
    /** "Tabela de Análise do Ambiente Físico"; each header gets its unit. */
    physicalEnvironment: {
      title: string
      columns: ColumnLabels<'physicalEnvironment'>
    }
  }
  /** "lux", "dB", "m/s", "°C" and "%". */
  units: Record<ErgonomicWorkAnalysisMeasure, string>
  /** The fixed reference values, as text: "*(500)", "*(<0,75)"… (D-4). */
  references: Record<ErgonomicWorkAnalysisMeasure, string>
}

/**
 * The answers, `''` or `null` when blank. The measures come already formatted
 * in the user's locale ("0,5" in pt-BR, "0.5" in en) and are printed as they
 * come.
 */
export type ErgonomicWorkAnalysisPdfAnswers = Record<
  ErgonomicWorkAnalysisAnswer,
  string | null
>

/** An Análise Ergonômica do Trabalho – Escritório, already formatted. */
export interface ErgonomicWorkAnalysisPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  answers: ErgonomicWorkAnalysisPdfAnswers
  /**
   * The workstation photo through `loadPdfPhoto`, `UNAVAILABLE_PHOTO` when it
   * did not download or decode, or `null` when the record has none.
   */
  photo: PdfPhoto | null
}

export interface BuildErgonomicWorkAnalysisPdfInput {
  /** The record, or `null` for the blank form (FR-020). */
  record: ErgonomicWorkAnalysisPdfRecord | null
  labels: ErgonomicWorkAnalysisPdfLabels
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

/** The legacy `HEIGHT=120` of the workstation row. */
const WORKSTATION_MIN_HEIGHT = px(120)
/** The legacy `HEIGHT=150` of the advanced analysis row. */
const ADVANCED_ANALYSIS_MIN_HEIGHT = px(150)
/** The photo cell: at least this high, and on the blank form (FR-020). */
const PHOTO_MIN_HEIGHT = 60
/** A tall photo grows the cell up to this height, not further. */
const PHOTO_MAX_HEIGHT = 120

// The legacy `WIDTH` of each cell, as fractions of the page width.
const TABLE_COLUMNS: { [T in ErgonomicWorkAnalysisTable]: number[] } = {
  workstation: [273, 103, 288],
  advancedAnalysis: [91, 191, 383],
  // Each measure beside its reference.
  physicalEnvironment: [54, 62, 39, 50, 37, 65, 46, 69, 41, 51],
}

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
 * Escritório, or its blank form (FR-019, FR-020), black on white, in the
 * order of the legacy `ergonomicworkanalysis.pdf.twig`: the title of the type
 * and the code; "Imagem do posto" across the page; "Dados da Atividade:" and,
 * on the right, "Data:"; the table [Configurações básicas do posto
 * administrativo | Postura de trabalho | Fatores biomecânicos]; the "Tabela
 * de Análise Ergonômica Avançada" [Setor | Classificação global do posto de
 * trabalho | Alteração necessária]; and the "Tabela de Análise do Ambiente
 * Físico", each of the 5 measures under its header with its unit, beside its
 * fixed reference.
 *
 * The photo fills its cell keeping its aspect ratio; with no photo the cell is
 * empty, and an unavailable one shows the notice instead. The measures are
 * printed as they come, never highlighted, even out of their reference
 * (R-13); a blank one stays blank. Texts keep their line breaks; a table that
 * does not fit continues on the next page with its header repeated, and a row
 * moves whole to the next page unless it is taller than a page. The blank
 * form has no code, photo or value, keeps the references, and has a photo
 * cell of at least 60 mm and every text cell at least 3 lines high, to be
 * filled by hand. Uses jsPDF's Helvetica (WinAnsi), which covers every label
 * of pt-BR, en and es, "°", "<", ">" and "–" included (NFR-008).
 */
export function buildErgonomicWorkAnalysisPdf({
  record,
  labels,
}: BuildErgonomicWorkAnalysisPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

  /** Column widths in millimeters from the legacy cell widths. */
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

  // "Imagem do posto" across the page.
  const photo = record?.photo ?? null
  const photoWidth = contentWidth - PADDING * 2
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

  table({
    head: [[labels.photo]],
    body: [[photoCell]],
    didDrawCell: (data) => {
      if (data.section !== 'body') return
      drawPhoto(doc, data, labels.photoUnavailable)
    },
  })

  // "Dados da Atividade:" on the left and "Data:" on the right, without
  // borders.
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

  // The two tables of texts, one row each.
  function textTable(
    name: 'workstation' | 'advancedAnalysis',
    title: string | null,
    minHeight: number
  ) {
    const keys = ERGONOMIC_WORK_ANALYSIS_TABLES[name]
    const columns = labels.tables[name].columns as Record<string, string>

    table({
      head: [
        ...(title ? [titleRow(title, keys.length)] : []),
        keys.map((key) => columns[key]),
      ],
      body: [keys.map((key) => text(record?.answers[key]))],
      columnStyles: widths(TABLE_COLUMNS[name]),
      bodyStyles: { minCellHeight: textHeight(minHeight) },
    })
  }

  textTable('workstation', null, WORKSTATION_MIN_HEIGHT)
  textTable(
    'advancedAnalysis',
    labels.tables.advancedAnalysis.title,
    ADVANCED_ANALYSIS_MIN_HEIGHT
  )

  // The physical environment: each header with its unit over the measure and
  // its reference, centered as in the legacy report.
  const measures = ERGONOMIC_WORK_ANALYSIS_TABLES.physicalEnvironment
  const physical = labels.tables.physicalEnvironment

  table(
    {
      head: [
        titleRow(physical.title, measures.length * 2),
        measures.map((key) => ({
          content: `${physical.columns[key]} (${labels.units[key]})`,
          colSpan: 2,
          styles: { valign: 'middle' },
        })),
      ],
      body: [
        measures.flatMap((key) => [
          text(record?.answers[key]),
          labels.references[key],
        ]),
      ],
      columnStyles: widths(TABLE_COLUMNS.physicalEnvironment),
      bodyStyles: { halign: 'center', valign: 'middle' },
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
