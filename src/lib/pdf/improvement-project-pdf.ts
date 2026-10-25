import { jsPDF } from 'jspdf'
import { autoTable, type CellDef, type CellHookData } from 'jspdf-autotable'

import type { ImprovementProjectScope } from '@/http/api'

import type { PdfPhoto } from './load-photo'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React (D-12). Field labels carry their own colon.
 */
export interface ImprovementProjectPdfLabels {
  titles: Record<ImprovementProjectScope, string>
  concern: string
  recommendation: string
  date: string
  priority: string
  activity: string
  before: string
  after: string
  ergonomicRisk: string
  photoUnavailable: string
}

/** A project register as the report prints it, already formatted. */
export interface ImprovementProjectPdfRecord {
  code: string
  /** Formatted in the user's locale. */
  date: string
  /** `código — nome`. */
  activity: string
  concern: string
  improvementRecommendation: string
  priority: string
}

/** Each photo, or `null` when the record has none (an empty cell). */
export interface ImprovementProjectPdfPhotos {
  before: PdfPhoto | null
  after: PdfPhoto | null
}

export interface BuildImprovementProjectPdfInput {
  /** The record, or `null` for the blank form (R-27). */
  project: ImprovementProjectPdfRecord | null
  scope: ImprovementProjectScope
  labels: ImprovementProjectPdfLabels
  photos?: ImprovementProjectPdfPhotos
}

// The colors of the legacy report (`improvementproject.pdf.twig`).
const DARK = '#006b72'
const MEDIUM = '#a7ccce'
const LIGHT = '#e8f2f2'
const TEXT = '#000000'
const WHITE = '#ffffff'

// Millimeters, on an A4 page in landscape.
const MARGIN = 12
const PADDING = 2
const TITLE_HEIGHT = 12
const MIN_PHOTO_HEIGHT = 50

const FONT_SIZE = 10
const CONCERN_FONT_SIZE = 12

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/**
 * A cell with a bold label above its value. The label is drawn by
 * `drawLabel` in the space the top padding reserves, so the table still sizes
 * the row by the value's lines.
 */
interface LabeledCell extends CellDef {
  label: string
}

function labeledCell(
  doc: jsPDF,
  label: string,
  value: string,
  styles: CellDef['styles'] & { fillColor: string; textColor?: string },
  colSpan = 1
): LabeledCell {
  const fontSize = styles.fontSize ?? FONT_SIZE

  return {
    label,
    content: value,
    colSpan,
    styles: {
      ...styles,
      cellPadding: {
        top: PADDING + lineHeight(doc, fontSize) + 0.5,
        right: PADDING,
        bottom: PADDING,
        left: PADDING,
      },
    },
  }
}

function drawLabel(doc: jsPDF, data: CellHookData) {
  const { cell } = data
  const { label } = cell.raw as Partial<LabeledCell>
  if (!label) return

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(cell.styles.fontSize)
  doc.setTextColor(String(cell.styles.textColor))
  doc.text(label, cell.x + PADDING, cell.y + PADDING, { baseline: 'top' })
}

/** A photo cell, told apart from the others by `photo`. */
interface PhotoCell extends CellDef {
  photo: PdfPhoto | null
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

/**
 * Builds the landscape A4 report of a project register, RGP or RGA, or its
 * blank form (FR-038, R-26, R-27), with the layout of the legacy report: the
 * type title and the code, the concern, the improvement recommendation, the
 * date, the priority and the activity side by side, then the "before" and
 * "after" columns with the ergonomic risk and the photos. Uses jsPDF's
 * Helvetica, which covers the accents of pt-BR and es (H-5).
 */
export function buildImprovementProjectPdf({
  project,
  scope,
  labels,
  photos = { before: null, after: null },
}: BuildImprovementProjectPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const columnWidth = (pageWidth - MARGIN * 2) / 2
  const title = labels.titles[scope]

  doc.setProperties({ title: project ? `${title} ${project.code}` : title })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(DARK)
  doc.text(title, MARGIN, MARGIN, { baseline: 'top' })
  if (project) {
    doc.text(project.code, pageWidth - MARGIN, MARGIN, {
      align: 'right',
      baseline: 'top',
    })
  }

  const tableOptions = {
    theme: 'grid' as const,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      textColor: TEXT,
      lineColor: TEXT,
      lineWidth: 0.3,
      cellPadding: PADDING,
      valign: 'top' as const,
    },
    columnStyles: {
      0: { cellWidth: columnWidth },
      1: { cellWidth: columnWidth },
    },
  }

  let fieldsEnd = MARGIN + TITLE_HEIGHT

  autoTable(doc, {
    ...tableOptions,
    startY: MARGIN + TITLE_HEIGHT,
    rowPageBreak: 'avoid',
    body: [
      [
        labeledCell(
          doc,
          labels.concern,
          project?.concern ?? '',
          {
            fillColor: DARK,
            textColor: WHITE,
            fontSize: CONCERN_FONT_SIZE,
            minCellHeight: 16,
          },
          2
        ),
      ],
      [
        labeledCell(
          doc,
          labels.recommendation,
          project?.improvementRecommendation ?? '',
          { fillColor: MEDIUM, minCellHeight: 14 },
          2
        ),
      ],
      [
        labeledCell(
          doc,
          labels.date,
          project?.date ?? '',
          { fillColor: MEDIUM, minCellHeight: 11 },
          2
        ),
      ],
      [
        labeledCell(doc, labels.priority, project?.priority ?? '', {
          fillColor: LIGHT,
          minCellHeight: 11,
        }),
        labeledCell(doc, labels.activity, project?.activity ?? '', {
          fillColor: LIGHT,
          minCellHeight: 11,
        }),
      ],
      [
        {
          content: labels.before,
          styles: { fillColor: MEDIUM, fontStyle: 'bold', halign: 'center' },
        },
        {
          content: labels.after,
          styles: { fillColor: MEDIUM, fontStyle: 'bold', halign: 'center' },
        },
      ],
      [
        labeledCell(doc, labels.ergonomicRisk, '', { fillColor: LIGHT }),
        labeledCell(doc, labels.ergonomicRisk, '', { fillColor: LIGHT }),
      ],
    ],
    didDrawCell: (data) => drawLabel(doc, data),
    didDrawPage: (data) => {
      if (data.cursor) fieldsEnd = data.cursor.y
    },
  })

  // The photo row takes the rest of the page, like the 380 px cells of the
  // legacy report.
  const photoHeight = Math.max(
    MIN_PHOTO_HEIGHT,
    pageHeight - MARGIN - fieldsEnd
  )
  const photoStyles = { fillColor: MEDIUM, minCellHeight: photoHeight }
  const photoRow: PhotoCell[] = [
    { content: '', photo: photos.before, styles: photoStyles },
    { content: '', photo: photos.after, styles: photoStyles },
  ]

  autoTable(doc, {
    ...tableOptions,
    startY: fieldsEnd,
    rowPageBreak: 'avoid',
    body: [photoRow],
    didDrawCell: (data) => drawPhoto(doc, data, labels.photoUnavailable),
  })

  return doc.output('blob')
}
