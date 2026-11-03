import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'

import type { PdfPhoto } from './load-photo'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React (D-7). Field labels carry their own colon.
 */
export interface HitListPdfLabels {
  title: string
  /** "Passo 3". */
  step: (n: number) => string
  date: string
  /** The instruction of each step, after its "Passo N" badge. */
  steps: {
    activity: string
    tasks: string
    items: string
    rootCauses: string
    improvements: string
    feedback: string
    engineer: string
  }
  fields: {
    activity: string
    department: string
    site: string
    turn: string
    station: string
    product: string
  }
  task: string
  rootCause: string
  remember: string
  /** The captions of the three "Lembre-se" images. */
  rememberItems: [string, string, string]
  hitListItems: string
  /** The names of the 10 items, in the order of `images.items`. */
  items: string[]
  yes: string
  no: string
  anotherWorkstationAffected: string
  /** "Se sim, quais?", after the yes/no of the first question. */
  ifSoWhich: string
  createdOtherProblem: string
  /** "Se sim, explique:", after the yes/no of the second question. */
  ifSoExplain: string
  problemSolved: string
  engineeringAware: string
  documentNeedUpdate: string
  engineerName: string
}

/** The answers of one item of step 3. */
export interface HitListPdfItemAnswers {
  /** 4 texts. */
  tasks: string[]
  /** 4 texts. */
  rootCauses: string[]
}

/** An improvement of step 5 and, per item, whether it is marked. */
export interface HitListPdfImprovement {
  text: string
  /** One per item, in the order of `labels.items`. */
  items: boolean[]
}

/**
 * A Hit List as the report prints it: every text already formatted, `''`
 * when empty, and `null` for a yes/no not answered (neither is marked).
 */
export interface HitListPdfRecord {
  code: string
  /** The assessment date, formatted in the user's locale. */
  date: string
  /** `código — nome`. */
  activity: string
  department: string
  site: string
  turn: string
  station: string
  product: string
  /** 8 texts. */
  tasks: string[]
  /** 10, in the order of `labels.items`. */
  items: HitListPdfItemAnswers[]
  /** A to H. */
  rootCauses: string[]
  /** 10. */
  improvements: HitListPdfImprovement[]
  isAnotherWorkstationAffected: boolean | null
  anotherWorkstationAffected: string
  isCreatedOtherProblem: boolean | null
  createdOtherProblem: string
  isProblemSolved: boolean | null
  isEngineeringAware: boolean | null
  engineeringAware: string
  documentNeedUpdate: boolean | null
  responsibleEngineeringToUpdateDoc: string
}

/** The images of the legacy report; one that did not load leaves its cell empty. */
export interface HitListPdfImages {
  /** The 10 items, in the order of `labels.items`. */
  items: PdfPhoto[]
  /** "Tool/Target", "Comfort Zone" and "Don't Give Me Static". */
  remember: PdfPhoto[]
  /** The item names written vertically over the columns of step 5. */
  itemsHeader: PdfPhoto
}

export interface BuildHitListPdfInput {
  /** The record, or `null` for the blank form (FR-014). */
  record: HitListPdfRecord | null
  labels: HitListPdfLabels
  images: HitListPdfImages
}

// The colors of the legacy report (`hitlist.sass`): the blue, the translucent
// blues over white and the `lighten(gray, 40%)` of the step headers.
const BLUE = '#28647a'
const MEDIUM_BLUE = '#609ab0'
const LIGHT_BLUE = '#ced9dd'
const GRAY = '#e6e6e6'
const TEXT = '#000000'
const WHITE = '#ffffff'

// Millimeters, on an A4 page in portrait.
const MARGIN = 10
const PADDING = 1.5
const TITLE_HEIGHT = 14
const GAP = 3
const MARGINS = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }

const FONT_SIZE = 9
const SMALL_FONT_SIZE = 7

const ITEMS_PER_ROW = 5
const ITEM_IMAGE_HEIGHT = 24
const MARK_COLUMN_WIDTH = 8
const REMEMBER_ROW_HEIGHT = 55
/** Height of a field left blank, so it can be filled in by hand. */
const WRITING_HEIGHT = 7
const TEXT_AREA_HEIGHT = 16

/** Line height of `fontSize` in millimeters, as jsPDF lays text out. */
function lineHeight(doc: jsPDF, fontSize: number) {
  return (fontSize * doc.getLineHeightFactor() * 25.4) / 72
}

/** The custom parts of a cell, read back by `drawCell`. */
interface HitListCell extends CellDef {
  /** Bold text drawn before the value, on its first line. */
  label?: string
  /** A "Passo N" badge drawn before the text. */
  badge?: string
  /** Images fitted into the cell, side by side, each with a caption. */
  images?: { photo: PdfPhoto; caption?: string }[]
}

/** `(X) Sim ( ) Não`, the legacy toggle; `null` marks neither. */
function toggle(value: boolean | null, labels: HitListPdfLabels) {
  const mark = (checked: boolean) => (checked ? '(X)' : '( )')

  return `${mark(value === true)} ${labels.yes}   ${mark(value === false)} ${labels.no}`
}

/**
 * A field with a bold label on the left of its value: the label is drawn by
 * `drawCell` in the room the left padding leaves, so the value wraps beside
 * it and the table still sizes the row by the value's lines.
 */
function field(
  doc: jsPDF,
  label: string,
  value: string,
  styles: CellDef['styles'] = {},
  colSpan = 1
): HitListCell {
  const fontSize = styles.fontSize ?? FONT_SIZE

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const labelWidth = doc.getTextWidth(label)

  return {
    label,
    content: value,
    colSpan,
    styles: {
      minCellHeight: WRITING_HEIGHT,
      ...styles,
      cellPadding: {
        top: PADDING,
        right: PADDING,
        bottom: PADDING,
        left: PADDING + labelWidth + 1.5,
      },
    },
  }
}

/**
 * The header row of a step: the "Passo N" badge in the legacy blue and the
 * instruction in blue over gray.
 */
function stepHeader(
  doc: jsPDF,
  badge: string,
  instruction: string,
  colSpan: number,
  fillColor = GRAY
): HitListCell {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_SIZE)
  const badgeWidth = doc.getTextWidth(badge) + PADDING * 2

  return {
    badge,
    content: instruction,
    colSpan,
    styles: {
      fillColor,
      textColor: BLUE,
      fontStyle: 'bold',
      cellPadding: {
        top: PADDING,
        right: PADDING,
        bottom: PADDING,
        left: badgeWidth + PADDING * 2,
      },
    },
  }
}

function drawLabel(doc: jsPDF, data: CellHookData, label: string) {
  const { cell } = data

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(cell.styles.fontSize)
  doc.setTextColor(String(cell.styles.textColor))
  doc.text(label, cell.x + PADDING, cell.y + PADDING, { baseline: 'top' })
}

function drawBadge(doc: jsPDF, data: CellHookData, badge: string) {
  const { cell } = data
  const fontSize = cell.styles.fontSize

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const width = doc.getTextWidth(badge) + PADDING * 2
  const height = lineHeight(doc, fontSize) + PADDING

  doc.setFillColor(BLUE)
  doc.rect(cell.x, cell.y + (PADDING - 0.75), width, height, 'F')
  doc.setTextColor(WHITE)
  doc.text(badge, cell.x + PADDING, cell.y + PADDING, { baseline: 'top' })
}

/**
 * Fits the images in the cell, side by side in equal slots, keeping their
 * aspect ratio, with the caption below each one. An image that did not load
 * leaves its slot empty.
 */
function drawImages(
  doc: jsPDF,
  data: CellHookData,
  images: NonNullable<HitListCell['images']>
) {
  const { cell } = data
  const captionHeight = images.some((image) => image.caption)
    ? lineHeight(doc, SMALL_FONT_SIZE) + 1
    : 0
  const slotWidth = (cell.width - PADDING * 2) / images.length
  const boxHeight = cell.height - PADDING * 2 - captionHeight

  images.forEach(({ photo, caption }, index) => {
    const slotX = cell.x + PADDING + slotWidth * index
    const boxWidth = slotWidth - PADDING

    if (photo.status === 'ready') {
      const scale = Math.min(boxWidth / photo.width, boxHeight / photo.height)
      const width = photo.width * scale
      const height = photo.height * scale

      doc.addImage(
        photo.data,
        'JPEG',
        slotX + (slotWidth - width) / 2,
        cell.y + PADDING + (boxHeight - height) / 2,
        width,
        height
      )
    }

    if (caption) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(SMALL_FONT_SIZE)
      doc.setTextColor(TEXT)
      doc.text(
        caption,
        slotX + slotWidth / 2,
        cell.y + cell.height - PADDING - captionHeight + 1,
        { align: 'center', baseline: 'top', maxWidth: slotWidth }
      )
    }
  })
}

function drawCell(doc: jsPDF, data: CellHookData) {
  const raw = data.cell.raw as HitListCell | undefined
  if (!raw || typeof raw !== 'object') return

  if (raw.label) drawLabel(doc, data, raw.label)
  if (raw.badge) drawBadge(doc, data, raw.badge)
  if (raw.images) drawImages(doc, data, raw.images)
}

/**
 * Builds the portrait A4 report of a Hit List, or its blank form (FR-015,
 * FR-014), in the seven steps of the legacy `hitlist.pdf.twig`: the activity
 * and its identification, the 8 tasks, the 10 items with their image, 4
 * tasks and 4 root causes, the root causes A to H, then on a new page the
 * "Lembre-se" panel with the 10 improvements and their marked items, the
 * operator feedback and the engineer in charge. Every value is printed as
 * text (NFR-004), with jsPDF's Helvetica, which covers the accents of pt-BR
 * and es.
 */
export function buildHitListPdf({
  record,
  labels,
  images,
}: BuildHitListPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const value = (text: string | undefined) => text ?? ''

  doc.setProperties({
    title: record ? `${labels.title} ${record.code}` : labels.title,
  })

  // Title and code, then the date on the right, as in the legacy header.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(BLUE)
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
    tableLineColor: BLUE,
    tableLineWidth: 0.3,
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      textColor: TEXT,
      fillColor: WHITE,
      lineColor: BLUE,
      lineWidth: 0.2,
      cellPadding: PADDING,
      valign: 'top',
      overflow: 'linebreak',
    },
    rowPageBreak: 'avoid',
    didDrawCell: (data) => drawCell(doc, data),
  }

  let cursor = MARGIN + TITLE_HEIGHT

  // Columns of the same width, so a filled field never squeezes the others.
  const equalColumns = (count: number) => ({
    columnStyles: Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        i,
        { cellWidth: contentWidth / count },
      ])
    ),
  })

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

  // The date, alone on the right like the legacy `col-xs-offset-8`.
  const dateWidth = contentWidth / 3
  table({
    margin: { ...MARGINS, left: pageWidth - MARGIN - dateWidth },
    tableWidth: dateWidth,
    body: [[field(doc, labels.date, value(record?.date))]],
  })

  // Step 1: the activity and its identification, three per line.
  table({
    ...equalColumns(3),
    head: [[stepHeader(doc, labels.step(1), labels.steps.activity, 3)]],
    body: [
      [
        field(doc, labels.fields.activity, value(record?.activity)),
        field(doc, labels.fields.department, value(record?.department)),
        field(doc, labels.fields.site, value(record?.site)),
      ],
      [
        field(doc, labels.fields.turn, value(record?.turn)),
        field(doc, labels.fields.station, value(record?.station)),
        field(doc, labels.fields.product, value(record?.product)),
      ],
    ],
  })

  // Step 2: the 8 tasks, two per line, numbered by column like the legacy.
  const tasks = Array.from({ length: 8 }, (_, i) => value(record?.tasks[i]))
  table({
    ...equalColumns(2),
    head: [[stepHeader(doc, labels.step(2), labels.steps.tasks, 2)]],
    body: Array.from({ length: 4 }, (_, row) => [
      field(doc, `${row * 2 + 1}.`, tasks[row * 2]),
      field(doc, `${row * 2 + 2}.`, tasks[row * 2 + 1]),
    ]),
  })

  // Step 3: the items in two bands of five, each with its name, its image,
  // and the 4 tasks and 4 root causes side by side.
  const step3: RowInput[] = []

  for (let start = 0; start < labels.items.length; start += ITEMS_PER_ROW) {
    const band = labels.items
      .slice(start, start + ITEMS_PER_ROW)
      .map((name, offset) => ({ name, index: start + offset }))

    step3.push(
      band.map(({ name }) => ({
        content: name,
        colSpan: 2,
        styles: {
          fillColor: MEDIUM_BLUE,
          textColor: WHITE,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: SMALL_FONT_SIZE,
        },
      })),
      band.map(
        ({ index }): HitListCell => ({
          content: '',
          colSpan: 2,
          images: [{ photo: images.items[index] }],
          styles: { minCellHeight: ITEM_IMAGE_HEIGHT },
        })
      ),
      band.flatMap(() =>
        [labels.task, labels.rootCause].map((content) => ({
          content,
          styles: {
            fontStyle: 'bold' as const,
            halign: 'center' as const,
            fontSize: SMALL_FONT_SIZE,
          },
        }))
      ),
      ...Array.from({ length: 4 }, (_, line) =>
        band.flatMap(({ index }) => {
          const answers = record?.items[index]

          return [answers?.tasks[line], answers?.rootCauses[line]].map(
            (text) => ({
              content: value(text),
              styles: { fontSize: SMALL_FONT_SIZE, minCellHeight: 6 },
            })
          )
        })
      )
    )
  }

  table({
    head: [
      [stepHeader(doc, labels.step(3), labels.steps.items, ITEMS_PER_ROW * 2)],
    ],
    body: step3,
    ...equalColumns(ITEMS_PER_ROW * 2),
  })

  // Step 4: the root causes A to H, two per line.
  const letters = 'ABCDEFGH'.split('')
  table({
    ...equalColumns(2),
    head: [[stepHeader(doc, labels.step(4), labels.steps.rootCauses, 2)]],
    body: Array.from({ length: 4 }, (_, row) =>
      [row * 2, row * 2 + 1].map((i) =>
        field(doc, `${letters[i]}.`, value(record?.rootCauses[i]))
      )
    ),
  })

  // Step 5 starts a page, like the legacy `pagebreak`: the "Lembre-se"
  // panel, the item names over their columns, and the improvements with a
  // mark in the column of each item linked to them.
  doc.addPage()
  cursor = MARGIN

  const itemCount = labels.items.length
  const improvementWidth = contentWidth - MARK_COLUMN_WIDTH * itemCount
  const markColumns = Object.fromEntries(
    Array.from({ length: itemCount }, (_, i) => [
      i + 1,
      { cellWidth: MARK_COLUMN_WIDTH, halign: 'center' as const },
    ])
  )
  const emptyMarks = (fillColor?: string) =>
    Array.from({ length: itemCount }, () => ({
      content: '',
      styles: fillColor ? { fillColor } : {},
    }))

  table({
    head: [
      [
        {
          content: `${labels.remember}...`,
          styles: {
            fillColor: LIGHT_BLUE,
            textColor: BLUE,
            fontStyle: 'bold',
            halign: 'center',
          },
        },
        {
          content: labels.hitListItems,
          colSpan: itemCount,
          styles: {
            fillColor: MEDIUM_BLUE,
            textColor: WHITE,
            fontStyle: 'bold',
            halign: 'center',
          },
        },
      ],
    ],
    body: [
      [
        {
          content: '',
          images: images.remember.map((photo, i) => ({
            photo,
            caption: labels.rememberItems[i],
          })),
          styles: { minCellHeight: REMEMBER_ROW_HEIGHT },
        } satisfies HitListCell,
        {
          content: '',
          colSpan: itemCount,
          images: [{ photo: images.itemsHeader }],
          styles: { cellPadding: 0 },
        } satisfies HitListCell,
      ],
      [
        stepHeader(
          doc,
          labels.step(5),
          labels.steps.improvements,
          1,
          LIGHT_BLUE
        ),
        ...emptyMarks(LIGHT_BLUE),
      ],
      ...Array.from({ length: 10 }, (_, i) => {
        const improvement = record?.improvements[i]

        return [
          {
            content: value(improvement?.text),
            styles: { minCellHeight: WRITING_HEIGHT },
          },
          ...Array.from({ length: itemCount }, (_, item) => ({
            content: improvement?.items[item] ? 'X' : '',
            styles: { fontStyle: 'bold' as const, valign: 'middle' as const },
          })),
        ]
      }),
    ],
    columnStyles: { 0: { cellWidth: improvementWidth }, ...markColumns },
  })

  // Step 6: the operator feedback, each question with its yes/no and, for
  // the first two, the explanation below.
  const question = (text: string, answer: boolean | null, suffix = '') => ({
    content: `${text}   ${toggle(answer, labels)}${suffix ? `   ${suffix}` : ''}`,
    styles: { fontStyle: 'bold' as const },
  })
  const textArea = (text: string | undefined) => ({
    content: value(text),
    styles: { minCellHeight: TEXT_AREA_HEIGHT },
  })

  table({
    head: [[stepHeader(doc, labels.step(6), labels.steps.feedback, 1)]],
    body: [
      [
        question(
          labels.anotherWorkstationAffected,
          record?.isAnotherWorkstationAffected ?? null,
          labels.ifSoWhich
        ),
      ],
      [textArea(record?.anotherWorkstationAffected)],
      [
        question(
          labels.createdOtherProblem,
          record?.isCreatedOtherProblem ?? null,
          labels.ifSoExplain
        ),
      ],
      [textArea(record?.createdOtherProblem)],
      [question(labels.problemSolved, record?.isProblemSolved ?? null)],
    ],
  })

  // Step 7: the engineer in charge.
  table({
    head: [[stepHeader(doc, labels.step(7), labels.steps.engineer, 1)]],
    body: [
      [question(labels.engineeringAware, record?.isEngineeringAware ?? null)],
      [field(doc, labels.engineerName, value(record?.engineeringAware))],
      [question(labels.documentNeedUpdate, record?.documentNeedUpdate ?? null)],
      [
        field(
          doc,
          labels.engineerName,
          value(record?.responsibleEngineeringToUpdateDoc)
        ),
      ],
    ],
  })

  return doc.output('blob')
}
