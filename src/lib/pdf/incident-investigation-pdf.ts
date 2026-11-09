import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  INCIDENT_INVESTIGATION_RISK_FACTORS,
  type IncidentInvestigationAnswer,
  type IncidentInvestigationRiskFactor,
} from '@/app/(app)/avaliacoes/components/incident-investigation-fields'
import type { PdfPhoto } from './load-photo'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface IncidentInvestigationPdfLabels {
  /** The type: "Avaliação de Incidente / Acidente". */
  title: string
  /** `evaluations.pdf.incidentInvestigation.fields`. */
  fields: {
    date: string
    activity: string
    sector: string
    employee: string
    /** "Ocorrência". */
    description: string
    /** "Fatores de Risco Ergonômico". */
    ergonomicRiskFactors: string
    comments: string
    /** "Imagem". */
    image: string
  }
  /** The 6 labels, `evaluations.incidentInvestigationFields.riskFactors`. */
  riskFactors: Record<IncidentInvestigationRiskFactor, string>
  /** "Foto indisponível", for a photo that did not load. */
  photoUnavailable: string
}

/** An Avaliação de Incidente / Acidente, already formatted. */
export interface IncidentInvestigationPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  /** The "Ocorrência", as typed, with its line breaks. */
  description: string
  /** As typed, with their line breaks; `null` or `''` when blank. */
  answers: Record<IncidentInvestigationAnswer, string | null>
  /**
   * The photo through `loadPdfPhoto`, `UNAVAILABLE_PHOTO` when it did not
   * download or decode, or `null` when the record has none.
   */
  photo: PdfPhoto | null
}

export interface BuildIncidentInvestigationPdfInput {
  /** The record, or `null` for the blank form (FR-017). */
  record: IncidentInvestigationPdfRecord | null
  labels: IncidentInvestigationPdfLabels
}

// Black on white, each cell with a thin black border; the factors alternate
// white and the legacy blue.
const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'
const FACTOR_BLUE = '#a4cde4'

/** CSS px of the legacy report, at 96 px per inch. */
function px(value: number) {
  return (value * 25.4) / 96
}

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 2
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
const LINE_WIDTH = 0.2
/** The room between the title and the code, and below the title. */
const TITLE_GAP = 5
/** The legacy `<br>` around the factors. */
const GAP = 5

const TITLE_FONT_SIZE = 15
const FONT_SIZE = 10

/** The legacy `min-height` of the "Ocorrência" text. */
const DESCRIPTION_MIN_HEIGHT = px(100)
/** The legacy `min-height` of the "Comentários" text. */
const COMMENTS_MIN_HEIGHT = px(150)
/** The legacy `min-height` of the image cell, without a photo. */
const IMAGE_MIN_HEIGHT = px(160)
/** The cell of a photo: at least this high… */
const PHOTO_MIN_HEIGHT = 60
/** …and a tall photo grows it up to this height, not further. */
const PHOTO_MAX_HEIGHT = 110

/** The legacy `<COL WIDTH>` of the factors. */
const FACTOR_COLUMNS = [166, 439]
/** The room above and below each line of the factors table… */
const FACTOR_LINE_PADDING = 0.4
/** …and above its first line and below its last, inside the frame. */
const FACTOR_EDGE_PADDING = 1
/** A factor's row on the blank form: room to write by hand. */
const BLANK_FACTOR_HEIGHT = 7

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function text(value: string | null | undefined) {
  return (value ?? '').replace(/\r\n?/g, '\n')
}

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/** The image cell, told apart from the others by `photo`. */
interface PhotoCell extends CellDef {
  photo: PdfPhoto | null
}

/**
 * Builds the portrait A4 report of an Avaliação de Incidente / Acidente, or
 * its blank form (FR-016, FR-017), black on white, in the order of the legacy
 * `incidentinvestigation.pdf.twig`:
 *
 * 1. the title of the type and the code; a title that does not fit wraps
 *    before reaching the code;
 * 2. the table Data, Atividade, Setor and Funcionário;
 * 3. "Ocorrência:" centered and in bold, with its text below;
 * 4. "Fatores de Risco Ergonômico" and the table with the 6 labels on the
 *    left, alternating white and `#a4cde4`, and the single text on the right;
 *    the labels are only a reference, nothing marks them (R-7);
 * 5. "Comentários:" centered and in bold, with its text below;
 * 6. the image cell: the photo whole and in proportion, 60 to 110 mm high,
 *    "Foto indisponível" when it did not load, or "Imagem:" with no photo.
 *
 * The legacy text cell of the factors spans the 6 rows, but a `rowSpan` cell
 * does not split across pages in jspdf-autotable: it scatters the labels over
 * the pages (RK-2). So the table has one row per line of the text, already
 * wrapped, with the labels on the first ones and a frame drawn per page. It
 * reads as one cell and goes on to the next pages, its title repeated, without
 * cutting a line; the labels stay together on the first page of the table.
 *
 * Texts keep their line breaks, and none is cut (FR-016): "Ocorrência" and
 * "Comentários" go on to the next page, repeating their heading, as the legacy
 * text flows. The image cell moves whole, never cutting the photo. A heading
 * never stays alone at the foot of a page. The blank form has no code, no
 * photo and no value, and keeps the legacy minimum heights, as a filled one
 * does. Uses jsPDF's Helvetica (WinAnsi), which covers every label of pt-BR, en
 * and es (NFR-007).
 */
export function buildIncidentInvestigationPdf({
  record,
  labels,
}: BuildIncidentInvestigationPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

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
    // unless it is taller than a page, so no text is cut. The texts that flow
    // across pages ask for 'auto'.
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  }

  let cursor =
    MARGIN + titleLines.length * lineHeight(doc, TITLE_FONT_SIZE) + TITLE_GAP

  /**
   * The height of the header and the given rows, measured on a scratch
   * document: jspdf-autotable only checks that the header fits before
   * starting, which can leave a heading alone at the foot of a page.
   */
  function startHeight(options: UserOptions, body: RowInput[] | undefined) {
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
      body,
      didDrawCell: undefined,
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    return scratch.getNumberOfPages() > 1
      ? Number.POSITIVE_INFINITY
      : end - MARGIN
  }

  function table(
    options: UserOptions,
    gap = 0,
    start = options.body?.slice(0, 1)
  ) {
    // A table starts on the next page when its start does not fit, unless it
    // is taller than a page anyway.
    const needed = startHeight(options, start)
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

  // 2. The table of two columns; the first as wide as its longest label.
  const { fields } = labels
  const headerRows: [string, string | null | undefined][] = [
    [fields.date, record?.date],
    [fields.activity, record?.activity],
    [fields.sector, record?.answers.sector],
    [fields.employee, record?.answers.employee],
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZE)
  const headerLabelWidth =
    Math.max(...headerRows.map(([label]) => doc.getTextWidth(`${label}:`))) +
    PADDING * 2 +
    1

  table({
    body: headerRows.map(([label, value]) => [`${label}:`, text(value)]),
    columnStyles: { 0: { cellWidth: headerLabelWidth } },
  })

  // 3 and 5. A centered heading in bold, repeated on each page, over its text.
  function textTable(
    heading: string,
    value: string | null | undefined,
    minHeight: number,
    gap = 0
  ) {
    table(
      {
        head: [[`${heading}:`]],
        body: [[text(value)]],
        bodyStyles: { minCellHeight: minHeight },
        rowPageBreak: 'auto',
      },
      gap,
      // It starts here when its minimum height fits, the text going on below.
      [['']]
    )
  }

  textTable(
    fields.description,
    record?.description,
    DESCRIPTION_MIN_HEIGHT,
    GAP
  )

  // 4. The factors: one row per line of the text (see above).
  const total = FACTOR_COLUMNS[0] + FACTOR_COLUMNS[1]
  const labelWidth = (contentWidth * FACTOR_COLUMNS[0]) / total
  const textWidth = contentWidth - labelWidth

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZE)
  const factorText = text(record?.answers.ergonomicRiskFactors)
  const factorLines: string[] = factorText
    ? doc.splitTextToSize(factorText, textWidth - PADDING * 2)
    : []
  const factorCount = INCIDENT_INVESTIGATION_RISK_FACTORS.length
  const factorRowCount = Math.max(factorCount, factorLines.length)
  const factorRows: RowInput[] = Array.from(
    { length: factorRowCount },
    (_, i) => {
      const factor = INCIDENT_INVESTIGATION_RISK_FACTORS[i]
      const cellPadding = {
        top: i === 0 ? FACTOR_EDGE_PADDING : FACTOR_LINE_PADDING,
        right: PADDING,
        bottom:
          i === factorRowCount - 1 ? FACTOR_EDGE_PADDING : FACTOR_LINE_PADDING,
        left: PADDING,
      }

      return [
        {
          content: factor ? labels.riskFactors[factor] : '',
          // White first, as in the legacy report; below the labels, white.
          styles: {
            cellPadding,
            fillColor: factor && i % 2 === 1 ? FACTOR_BLUE : WHITE,
            minCellHeight: record ? 0 : BLANK_FACTOR_HEIGHT,
          },
        },
        { content: factorLines[i] ?? '', styles: { cellPadding } },
      ]
    }
  )

  /** Where the rows went on each page, for its frame. */
  const frames = new Map<number, { top: number; bottom: number }>()

  table(
    {
      head: [
        [
          {
            content: fields.ergonomicRiskFactors,
            colSpan: 2,
            styles: {
              fontStyle: 'normal',
              halign: 'left',
              lineWidth: 0,
              cellPadding: { top: 0, right: 0, bottom: 1.3, left: 0 },
            },
          },
        ],
      ],
      body: factorRows,
      styles: { ...cellStyles, lineWidth: 0 },
      columnStyles: {
        0: { cellWidth: labelWidth },
        1: { cellWidth: textWidth },
      },
      didDrawCell: (data) => {
        if (data.section !== 'body') return
        const page = doc.getCurrentPageInfo().pageNumber
        const frame = frames.get(page)
        const bottom = data.cell.y + data.cell.height

        frames.set(page, {
          top: Math.min(frame?.top ?? data.cell.y, data.cell.y),
          bottom: Math.max(frame?.bottom ?? bottom, bottom),
        })
      },
    },
    GAP,
    factorRows.slice(0, factorCount)
  )

  const lastPage = doc.getCurrentPageInfo().pageNumber
  for (const [page, { top, bottom }] of frames) {
    doc.setPage(page)
    // jsPDF writes these to the current page, so each page needs them.
    doc.setDrawColor(BORDER)
    doc.setLineWidth(LINE_WIDTH)
    doc.rect(MARGIN, top, contentWidth, bottom - top, 'S')
    doc.line(MARGIN + labelWidth, top, MARGIN + labelWidth, bottom)
  }
  doc.setPage(lastPage)

  // 5. "Comentários".
  textTable(fields.comments, record?.answers.comments, COMMENTS_MIN_HEIGHT)

  // 6. The image cell, moved whole to the next page when it does not fit.
  const photo = record?.photo ?? null
  const photoWidth = contentWidth - PADDING * 2
  const imageHeight =
    photo?.status === 'ready'
      ? Math.min(
          PHOTO_MAX_HEIGHT,
          Math.max(
            PHOTO_MIN_HEIGHT,
            (photoWidth * photo.height) / photo.width + PADDING * 2
          )
        )
      : IMAGE_MIN_HEIGHT
  const imageCell: PhotoCell = {
    content: photo ? '' : `${fields.image}:`,
    photo,
    styles: { minCellHeight: imageHeight },
  }

  table({
    body: [[imageCell]],
    didDrawCell: (data) => {
      if (data.section !== 'body') return
      drawPhoto(doc, data, labels.photoUnavailable)
    },
  })

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
