import { jsPDF } from 'jspdf'
import {
  autoTable,
  type CellDef,
  type CellHookData,
  type RowInput,
  type UserOptions,
} from 'jspdf-autotable'
import {
  FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS,
  FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY,
  FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS,
  FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS,
  FUNCTIONAL_CINESIO_ASSESSMENT_TEST_TABLES,
  type FunctionalCinesioAssessmentAnswer,
  type FunctionalCinesioAssessmentColumn,
  type FunctionalCinesioAssessmentColumnItem,
  type FunctionalCinesioAssessmentExclusive,
  type FunctionalCinesioAssessmentHeaderField,
  type FunctionalCinesioAssessmentItem,
  type FunctionalCinesioAssessmentLabel,
  type FunctionalCinesioAssessmentLine,
  type FunctionalCinesioAssessmentPosturalGroup,
  type FunctionalCinesioAssessmentSection,
  type FunctionalCinesioAssessmentText,
} from '@/app/(app)/avaliacoes/components/functional-cinesio-assessment-fields'
import type { PdfPhoto } from './load-photo'

/**
 * Translated texts of the report, passed in by the screen so this module does
 * not depend on React.
 */
export interface FunctionalCinesioAssessmentPdfLabels {
  /** The type: "Avaliação Cinesiofuncional". */
  title: string
  /** `evaluations.functionalCinesioAssessmentFields.labels`. */
  texts: Record<FunctionalCinesioAssessmentLabel, string>
}

/** An Avaliação Cinesiofuncional, already formatted. */
export interface FunctionalCinesioAssessmentPdfRecord {
  code: string
  /** `código — nome`. */
  activity: string
  /** Formatted in the user's locale. */
  date: string
  evaluated: string
  /** Formatted in the user's locale. */
  birthDate: string
  /** "36 anos", from `ageAtDate` and the date of the assessment. */
  age: string | null
  registry: string
  /**
   * A mark or an exclusive answer as stored; a text as typed, with its line
   * breaks; a number already formatted in the user's locale.
   */
  answers: Record<FunctionalCinesioAssessmentAnswer, string | boolean | null>
}

/** The figures through `loadPdfPhoto`, `UNAVAILABLE_PHOTO` when one failed. */
export interface FunctionalCinesioAssessmentPdfFigures {
  posture: PdfPhoto
  scapulae: PdfPhoto
}

export interface BuildFunctionalCinesioAssessmentPdfInput {
  /** The record, or `null` for the blank form (FR-023). */
  record: FunctionalCinesioAssessmentPdfRecord | null
  labels: FunctionalCinesioAssessmentPdfLabels
  figures: FunctionalCinesioAssessmentPdfFigures
}

const BORDER = '#000000'
const TEXT = '#000000'
const WHITE = '#ffffff'

/** CSS px of the legacy report, at 96 px per inch. */
function px(value: number) {
  return (value * 25.4) / 96
}

// Millimeters, on an A4 page in portrait.
const MARGIN = 12
const PADDING = 1.6
const LINE_WIDTH = 0.2
const TITLE_GAP = 5
/** The room above the title of a section. */
const SECTION_GAP = 4
/** The room between two tables of a section. */
const TABLE_GAP = 3

const TITLE_FONT_SIZE = 15
const FONT_SIZE = 9

/** The legacy figures, at their own size: they are never enlarged (RK-5). */
const POSTURE_WIDTH = px(188)
const POSTURE_HEIGHT = px(155)
const SCAPULAE_WIDTH = px(108)
const SCAPULAE_HEIGHT = px(58)
/** The room between the measures and the posture figure. */
const POSTURE_GAP = 3

/** The columns of a line of a section: 12, as the legacy `col-xs` grid. */
const GRID_COLUMNS = 12

/** The columns of the tables of tests: segment, tests, right and left. */
const TEST_COLUMNS = [30, 60, 48, 48]

/** On the blank form, the room to write a line by hand… */
const BLANK_LINE_HEIGHT = 8
/** …and a long text. */
const BLANK_LONG_HEIGHT = 18

/** A text that flows across pages starts where at least this much fits. */
const MIN_FLOW_HEIGHT = 16

/** What stands for a measure inside a line of text, on paper. */
const BLANK_VALUE = '______'

const MARKED = '( X )'
const UNMARKED = '(   )'
const ITEM_SEPARATOR = '  '

const ARROWS = { '↑': 'up', '↓': 'down' } as const
type ArrowDirection = (typeof ARROWS)[keyof typeof ARROWS]

/** The arrow that ends a label, drawn because it is outside cp1252 (FR-024). */
function splitArrow(label: string): {
  text: string
  direction: ArrowDirection | null
} {
  const last = label.at(-1) as keyof typeof ARROWS
  const direction = ARROWS[last] ?? null

  return { text: direction ? label.slice(0, -1).trimEnd() : label, direction }
}

/** A line ending of any platform becomes `\n`, the one jsPDF breaks on. */
function normalize(value: string) {
  return value.replace(/\r\n?/g, '\n')
}

/** A label followed by a colon, unless it already ends a question. */
function withColon(label: string) {
  return /[?:]$/.test(label) ? label : `${label}:`
}

/** A cell with an arrow to draw after one of its lines. */
interface ArrowCell extends CellDef {
  arrows?: { line: string; direction: ArrowDirection }[]
  /** The scapulae figure, in the top right corner of the cell. */
  figure?: PdfPhoto
}

/**
 * Builds the portrait A4 report of an Avaliação Cinesiofuncional, or its blank
 * form (FR-022, FR-023), black on white, in the order of the legacy
 * `functionalcinesioassessment.pdf.twig`, walking the data of
 * `functional-cinesio-assessment-fields.ts`:
 *
 * 1. the title of the type and the code, the activity and the date;
 * 2. the sections I to VII, each with its title in a bordered box, which never
 *    stays alone at the foot of a page;
 * 3. the section V with the measures beside the posture figure, and the two
 *    tables of tests, the fixed labels of each segment beside its right and left
 *    texts;
 * 4. the section VI with one table per body part, the scapulae figure in its
 *    cell and each mark as `( X ) label` or `(   ) label`;
 * 5. the section VII, the evaluator and the assessed person.
 *
 * No `rowSpan`: a `rowSpan` cell does not split across pages in jspdf-autotable,
 * so a long text would scatter or be cut. The posture figure is drawn beside the
 * table, and each line of a section is a table of one row on a grid of 12
 * columns. A long text goes on to the next pages, and so does a row of tests
 * taller than a page, repeating its header: no text is cut (AC-023).
 *
 * A figure that is unavailable leaves its place empty and does not stop the PDF
 * (H-7). The blank form has no code and no values, the fixed values of a select
 * as marks, and room to write by hand. Uses jsPDF's Helvetica (WinAnsi); the
 * arrows of "Olhar ↑" and "Olhar ↓" are outside it, so they are drawn (FR-024).
 */
export function buildFunctionalCinesioAssessmentPdf({
  record,
  labels,
  figures,
}: BuildFunctionalCinesioAssessmentPdfInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageBottom = doc.internal.pageSize.getHeight() - MARGIN
  const contentWidth = pageWidth - MARGIN * 2
  const { texts } = labels

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

  const margins = { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }

  const base: UserOptions = {
    theme: 'grid',
    margin: margins,
    styles: cellStyles,
    headStyles: { ...cellStyles, fontStyle: 'bold', halign: 'center' },
    // A row moves whole unless it is taller than a page, and then it splits,
    // so no text is cut.
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    didDrawCell: (data) => drawCellExtras(doc, data),
  }

  const titleHeight =
    (titleLines.length * TITLE_FONT_SIZE * doc.getLineHeightFactor() * 25.4) /
    72
  let cursor = MARGIN + titleHeight + TITLE_GAP

  /** The title of the section, waiting for the first table of the section. */
  let pendingHeading: UserOptions | null = null

  /** The height of a table, measured on a scratch document. */
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
      didDrawCell: undefined,
      didDrawPage: (data) => {
        if (data.cursor) end = data.cursor.y
      },
    })
    return scratch.getNumberOfPages() > 1
      ? Number.POSITIVE_INFINITY
      : end - MARGIN
  }

  function draw(options: UserOptions) {
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

  function newPage() {
    doc.addPage()
    cursor = MARGIN
  }

  /**
   * Draws a table, first moving to the next page when the title waiting for it
   * and its start do not fit there together. `room` asks for more than that.
   */
  function table(options: UserOptions, room = 0) {
    const heading = pendingHeading

    if (heading) {
      const start = measure({ ...options, body: options.body?.slice(0, 1) })
      const needed =
        measure(heading) +
        Math.max(room, Number.isFinite(start) ? start : MIN_FLOW_HEIGHT)

      if (cursor + needed > pageBottom) newPage()
      draw(heading)
      pendingHeading = null
    } else if (room && cursor + room > pageBottom) {
      newPage()
    }
    draw(options)
  }

  function startSection(section: FunctionalCinesioAssessmentSection) {
    cursor += SECTION_GAP
    pendingHeading = {
      body: [
        [
          {
            content: `${section.number} – ${texts[section.title].toUpperCase()}`,
            styles: { fontStyle: 'bold', halign: 'center' },
          },
        ],
      ],
    }
  }

  // ---- The values
  function answer(key: FunctionalCinesioAssessmentAnswer) {
    const value = record?.answers[key]
    return typeof value === 'string' ? normalize(value) : ''
  }

  function markText(on: boolean, label: string) {
    return `${on ? MARKED : UNMARKED} ${label}`
  }

  /**
   * Puts items side by side in a cell of `colSpan` columns, breaking the line
   * only between two of them, so a mark stays with its label. A non-breaking
   * space would not do it: jsPDF measures it almost twice as wide as it draws.
   * An item wider than the cell is left to wrap by itself.
   */
  function sideBySide(items: readonly string[], colSpan: number) {
    const width = (contentWidth / GRID_COLUMNS) * colSpan - PADDING * 2 - 0.1
    const lines: string[] = []
    let current = ''

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(FONT_SIZE)
    for (const item of items) {
      const candidate = current ? `${current}${ITEM_SEPARATOR}${item}` : item

      if (current && doc.getTextWidth(candidate) > width) {
        lines.push(current)
        current = item
      } else {
        current = candidate
      }
    }
    lines.push(current)
    return lines.join('\n')
  }

  function isMarked(key: FunctionalCinesioAssessmentAnswer) {
    return record?.answers[key] === true
  }

  function exclusiveItems(item: FunctionalCinesioAssessmentExclusive) {
    const value = record?.answers[item.key]

    return [
      markText(value === true, texts[item.yes]),
      markText(value === false, texts[item.no]),
    ]
  }

  /** "12,5 kg", or the line to write on, for a value inside a sentence. */
  function measureText(item: FunctionalCinesioAssessmentText) {
    const value = answer(item.key) || BLANK_VALUE
    return item.unit ? `${value} ${texts[item.unit]}` : value
  }

  function isLong(item: FunctionalCinesioAssessmentText) {
    return FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS[item.key] === 'longText'
  }

  // ---- The lines of a section
  function labelCell(label: string, colSpan: number): CellDef {
    return {
      content: withColon(label),
      colSpan,
      styles: { fontStyle: 'bold' },
    }
  }

  function valueCell(value: string, colSpan: number, long = false): CellDef {
    return {
      content: value,
      colSpan,
      styles: {
        minCellHeight: record
          ? 0
          : long
            ? BLANK_LONG_HEIGHT
            : BLANK_LINE_HEIGHT,
      },
    }
  }

  /** An item as its label and what goes side by side in its value's cell. */
  function itemCells(
    item: FunctionalCinesioAssessmentItem
  ): [string, readonly string[]][] {
    switch (item.kind) {
      case 'header':
        return [[texts[item.label], headerItems(item.field)]]
      case 'select': {
        // On paper the options are marks; on a record, only the chosen one.
        if (!record) {
          return [
            [
              texts[item.label],
              item.options.map((option) =>
                markText(false, texts[option.label])
              ),
            ],
          ]
        }
        const value = answer(item.key)
        const option = item.options.find((o) => o.value === value)
        return [[texts[item.label], option ? [texts[option.label]] : []]]
      }
      case 'exclusive':
        return [[texts[item.label], exclusiveItems(item)]]
      case 'marks':
        return [
          [
            texts[item.label],
            item.marks.map((mark) =>
              markText(isMarked(mark.key), texts[mark.label])
            ),
          ],
        ]
      case 'text':
        return [[texts[item.label], [answer(item.key)]]]
      default:
        return []
    }
  }

  function headerItems(field: FunctionalCinesioAssessmentHeaderField['field']) {
    if (!record) return []
    if (field === 'evaluated') return [normalize(record.evaluated)]
    if (field === 'registry') return [normalize(record.registry)]
    return record.age ? [record.birthDate, record.age] : [record.birthDate]
  }

  /** How a line of `count` cells takes the 12 columns, by section. */
  function spansOf(
    section: FunctionalCinesioAssessmentSection['id'],
    count: number
  ) {
    const compact = section === 'identification' || section === 'dynamometry'

    if (count === 2) return compact ? [2, 10] : [3, 9]
    if (count === 4) return compact ? [2, 4, 2, 4] : [3, 3, 2, 4]
    return compact ? [2, 2, 2, 2, 2, 2] : [3, 3, 2, 1, 1, 2]
  }

  function gridOptions(body: RowInput[]): UserOptions {
    const width = contentWidth / GRID_COLUMNS

    return {
      body,
      columnStyles: Object.fromEntries(
        Array.from({ length: GRID_COLUMNS }, (_, i) => [
          i,
          { cellWidth: width },
        ])
      ),
    }
  }

  function drawLine(
    section: FunctionalCinesioAssessmentSection['id'],
    line: FunctionalCinesioAssessmentLine
  ) {
    const [first] = line
    let cells: CellDef[]
    let long = false

    if (first?.kind === 'caption') {
      cells = [labelCell(texts[first.label], GRID_COLUMNS)]
    } else if (first?.kind === 'markedText') {
      // A pathology: its mark and its text, two per line, as in the legacy.
      cells = line.flatMap((item) =>
        item.kind === 'markedText'
          ? [
              {
                content: markText(
                  isMarked(item.mark.key),
                  texts[item.mark.label]
                ),
                colSpan: 3,
              },
              valueCell(answer(item.text.key), 3),
            ]
          : []
      )
    } else {
      const pairs = line.flatMap(itemCells)
      const spans = spansOf(section, pairs.length * 2)

      long = line.some((item) => item.kind === 'text' && isLong(item))
      cells = pairs.flatMap(([label, value], i) => [
        labelCell(label, spans[i * 2]),
        valueCell(sideBySide(value, spans[i * 2 + 1]), spans[i * 2 + 1], long),
      ])
    }

    table(
      {
        ...gridOptions([cells]),
        // A long text flows, starting where some of it fits.
        rowPageBreak: long ? 'auto' : 'avoid',
      },
      long ? MIN_FLOW_HEIGHT : 0
    )
  }

  // ---- The header
  const headerSpans = [2, 5, 2, 3]
  table(
    gridOptions([
      [
        labelCell(texts.activity, headerSpans[0]),
        valueCell(record?.activity ?? '', headerSpans[1]),
        labelCell(texts.assessmentDate, headerSpans[2]),
        valueCell(record?.date ?? '', headerSpans[3]),
      ],
    ])
  )

  // ---- The section IV: five measures with their units, side by side.
  function drawPhysicalExam(line: FunctionalCinesioAssessmentLine) {
    const items = line.filter(
      (item): item is FunctionalCinesioAssessmentText => item.kind === 'text'
    )

    table({
      body: [
        items.map(
          (item): CellDef => ({
            content: `${withColon(texts[item.label])} ${measureText(item)}`,
            styles: {
              halign: 'center',
              minCellHeight: record ? 0 : BLANK_LINE_HEIGHT,
            },
          })
        ),
      ],
    })
  }

  // ---- The section V: the measures beside the figure, then the tests.
  function drawMeasures(lines: readonly FunctionalCinesioAssessmentLine[]) {
    const room = POSTURE_HEIGHT
    const figureX = pageWidth - MARGIN - POSTURE_WIDTH
    const tableWidth = contentWidth - POSTURE_WIDTH - POSTURE_GAP
    const [labelWidth, valueWidth] = [tableWidth * 0.29, tableWidth * 0.21]

    const body = lines.map((line) => {
      const pairs = line.flatMap(itemCells)
      const cells: CellDef[] = pairs.flatMap(([label, [value = '']]) => [
        { content: label, styles: { fontStyle: 'bold' } },
        {
          content: value,
          styles: { minCellHeight: record ? 0 : BLANK_LINE_HEIGHT },
        },
      ])
      // The last line has one measure, and its other half stays empty.
      while (cells.length < 4) cells.push({ content: '' })
      return cells
    })

    const heading = pendingHeading
    if (heading) {
      if (cursor + measure(heading) + room > pageBottom) newPage()
      draw(heading)
      pendingHeading = null
    } else if (cursor + room > pageBottom) {
      newPage()
    }
    cursor += TABLE_GAP

    const startPage = doc.getCurrentPageInfo().pageNumber
    const top = cursor

    draw({
      body,
      margin: { ...margins, right: MARGIN + POSTURE_WIDTH + POSTURE_GAP },
      columnStyles: {
        0: { cellWidth: labelWidth },
        1: { cellWidth: valueWidth },
        2: { cellWidth: labelWidth },
        3: { cellWidth: valueWidth },
      },
    })

    const lastPage = doc.getCurrentPageInfo().pageNumber
    if (figures.posture.status === 'ready') {
      doc.setPage(startPage)
      doc.addImage(
        figures.posture.data,
        'JPEG',
        figureX,
        top,
        POSTURE_WIDTH,
        POSTURE_HEIGHT
      )
      doc.setPage(lastPage)
    }
    // The place of the figure is kept, even when it did not load (H-7).
    if (lastPage === startPage) {
      cursor = Math.max(cursor, top + POSTURE_HEIGHT)
    }
  }

  function drawTests() {
    const widths = Object.fromEntries(
      TEST_COLUMNS.map((cellWidth, i) => [i, { cellWidth }])
    )

    for (const tests of FUNCTIONAL_CINESIO_ASSESSMENT_TEST_TABLES) {
      cursor += TABLE_GAP

      const head = [
        [
          texts.bodySegments,
          texts[tests.title],
          texts.columnRight,
          texts.columnLeft,
        ].map((title) => title.toUpperCase()),
      ]
      const body: RowInput[] = [
        ...tests.segments.map((segment) => [
          {
            content: texts[segment.label].toUpperCase(),
            styles: { halign: 'center', valign: 'middle' },
          } as CellDef,
          segment.tests.map((test) => texts[test]).join('\n'),
          answer(segment.right.key),
          answer(segment.left.key),
        ]),
        ...tests.notes.map((note) => [
          {
            content: texts[note.label].toUpperCase(),
            styles: { halign: 'center', valign: 'middle' },
          } as CellDef,
          {
            content: answer(note.key),
            colSpan: 3,
            styles: { minCellHeight: record ? 0 : BLANK_LONG_HEIGHT },
          } as CellDef,
        ]),
      ]
      const options: UserOptions = { head, body, columnStyles: widths }
      const start = measure({ ...options, body: body.slice(0, 1) })

      table(options, Number.isFinite(start) ? start : MIN_FLOW_HEIGHT)
    }
  }

  // ---- The section VI: one table per body part.
  function columnCell(
    column: FunctionalCinesioAssessmentColumn,
    colSpan: number
  ): ArrowCell {
    const arrows: NonNullable<ArrowCell['arrows']> = []

    const itemTexts = (item: FunctionalCinesioAssessmentColumnItem) => {
      switch (item.kind) {
        case 'mark': {
          const { text, direction } = splitArrow(texts[item.label])
          const content = markText(isMarked(item.key), text)
          if (direction) arrows.push({ line: content, direction })
          return [content]
        }
        case 'exclusive':
          return exclusiveItems(item)
        case 'text':
          return [measureText(item)]
        case 'caption':
          return [withColon(texts[item.label])]
      }
    }

    /** A count stays with the D or the E it belongs to when the line wraps. */
    const lineItems = (
      line: readonly FunctionalCinesioAssessmentColumnItem[]
    ) => {
      const items: string[] = []

      for (const item of line) {
        const [first, ...others] = itemTexts(item)

        if (item.kind === 'text' && items.length > 0) {
          items[items.length - 1] += ` ${first}`
        } else {
          items.push(first, ...others)
        }
      }
      return items
    }

    return {
      content: column.lines
        .map((line) => sideBySide(lineItems(line), colSpan))
        .join('\n'),
      colSpan,
      arrows,
      figure: column.figure ? figures[column.figure] : undefined,
      styles: {
        lineWidth: {
          top: 0,
          right: LINE_WIDTH,
          bottom: LINE_WIDTH,
          left: LINE_WIDTH,
        },
        minCellHeight: column.figure ? SCAPULAE_HEIGHT + PADDING : 0,
      },
    }
  }

  function drawPosturalGroup(group: FunctionalCinesioAssessmentPosturalGroup) {
    const spans = POSTURAL_SPANS[group.id]
    const titled: RowInput[] = group.rows.flatMap((columns, r) => [
      columns.map(
        (column, c): CellDef => ({
          content: texts[column.title].toUpperCase(),
          colSpan: spans[r][c],
          styles: {
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: {
              top: PADDING,
              right: PADDING,
              bottom: 0.4,
              left: PADDING,
            },
            lineWidth: {
              top: LINE_WIDTH,
              right: LINE_WIDTH,
              bottom: 0,
              left: LINE_WIDTH,
            },
          },
        })
      ),
      columns.map((column, c) => columnCell(column, spans[r][c])),
    ])
    const options: UserOptions = {
      ...gridOptions([
        [labelCell(texts[group.title], GRID_COLUMNS)],
        ...titled,
      ]),
      // The body part stays together, on the next page when it does not fit.
      pageBreak: 'avoid',
    }
    const whole = measure(options)

    table(options, Number.isFinite(whole) ? whole : MIN_FLOW_HEIGHT)
  }

  // ---- The section VII.
  function drawDynamometry() {
    table(
      gridOptions([
        FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY.map(
          ({ value, result }): CellDef => ({
            content: `${withColon(texts[value.label].toUpperCase())} ${measureText(value)}\n\n${sideBySide(exclusiveItems(result), 3)}`,
            colSpan: 3,
            styles: { halign: 'center' },
          })
        ),
      ])
    )
  }

  // ---- The report
  for (const section of FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS) {
    switch (section.id) {
      case 'physicalExam':
        startSection(section)
        drawPhysicalExam(section.lines[0])
        break
      case 'posturalFlexibility':
        startSection(section)
        drawMeasures(section.lines)
        drawTests()
        break
      case 'posturalMarks':
        startSection(section)
        FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS.forEach((group, i) => {
          if (i > 0 && cursor > MARGIN) cursor += TABLE_GAP
          drawPosturalGroup(group)
        })
        break
      case 'dynamometry':
        startSection(section)
        drawDynamometry()
        cursor += TABLE_GAP
        for (const line of section.lines) drawLine(section.id, line)
        break
      default:
        startSection(section)
        for (const line of section.lines) drawLine(section.id, line)
    }
  }

  return doc.output('blob')
}

/** How each row of columns of a body part takes the 12 columns. */
const POSTURAL_SPANS: Record<
  FunctionalCinesioAssessmentPosturalGroup['id'],
  readonly (readonly number[])[]
> = {
  head: [[2, 2, 3, 3, 2]],
  upperLimbs: [
    [3, 3, 4, 2],
    [4, 4, 4],
  ],
  trunk: [[4, 3, 5]],
  lowerLimbs: [[5, 3, 4]],
}

function drawCellExtras(doc: jsPDF, data: CellHookData) {
  const raw = data.cell.raw as Partial<ArrowCell> | null
  if (!raw || typeof raw !== 'object') return

  if (raw.arrows?.length) drawArrows(doc, data, raw.arrows)
  if (raw.figure?.status === 'ready') {
    doc.addImage(
      raw.figure.data,
      'JPEG',
      data.cell.x + data.cell.width - SCAPULAE_WIDTH - PADDING,
      data.cell.y + PADDING / 2,
      SCAPULAE_WIDTH,
      SCAPULAE_HEIGHT
    )
  }
}

/** Draws each arrow after its line, with vector primitives (FR-024). */
function drawArrows(
  doc: jsPDF,
  data: CellHookData,
  arrows: NonNullable<ArrowCell['arrows']>
) {
  const { cell } = data
  const lines = cell.text
  const lineHeight = (FONT_SIZE * doc.getLineHeightFactor() * 25.4) / 72

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZE)
  doc.setDrawColor(TEXT)
  doc.setFillColor(TEXT)
  doc.setLineWidth(0.25)

  let from = 0
  for (const { line, direction } of arrows) {
    const index = lines.indexOf(line, from)
    if (index < 0) continue
    from = index + 1

    const x = cell.x + cell.padding('left') + doc.getTextWidth(line) + 1.6
    const middle = cell.y + cell.padding('top') + lineHeight * (index + 0.5)
    const half = 1.15
    const tip = direction === 'up' ? middle - half : middle + half
    const tail = direction === 'up' ? middle + half : middle - half
    const headBase = direction === 'up' ? tip + 1 : tip - 1

    doc.line(x, tail, x, headBase)
    doc.triangle(x, tip, x - 0.6, headBase, x + 0.6, headBase, 'F')
  }
}
