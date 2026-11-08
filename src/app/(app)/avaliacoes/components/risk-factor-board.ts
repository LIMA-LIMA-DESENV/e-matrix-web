/**
 * The board of the Identificação de Riscos (`risk_factor`, FR): the legacy
 * figure, its column titles, its body parts and its 39 markable items, with
 * where each one sits on the figure. The web's only copy of the board, shared
 * by the form and the PDF (FR-016, D-6), without React.
 *
 * Every box is in fractions of the figure (`x`, `y`, `w` and `h` between 0
 * and 1), so the screen places it in percent and the PDF in millimeters from
 * the same numbers. They are written below in pixels of the 432×443 figure:
 * the legacy regions of `riskfactor.js` (on the figure shown at 691×709) and
 * the labels of `riskfactor.scss` (in a 780 px paragraph, the figure centered
 * 44.5 px in), converted and fitted to the lines of the grid.
 */

/** The legacy `riskFactor.png`, copied unchanged to `public/`. */
export const RISK_FACTOR_FIGURE = {
  src: '/evaluations/risk-factor/risk-factor.png',
  width: 432,
  height: 443,
} as const

/** The namespace of the board's texts, read by the form and the PDF. */
export const RISK_FACTOR_BOARD_NAMESPACE = 'evaluations.riskFactorBoard'

/**
 * The 39 answer keys of the API catalog (FR-007), in the order of the board:
 * by body part, Postura → Estático → Repetição → Força, then Outros. The
 * camelCase of the legacy `data-value`s.
 */
export const RISK_FACTOR_KEYS = [
  'handsFlexion',
  'radialDeviation',
  'handsExtension',
  'ulnarDeviation',
  'handsStatic',
  'handsRapid',
  'pinch',
  'grip',
  'hammer',
  'supinationPronation',
  'elbowsStatic',
  'elbowsRapid',
  'forearmTwist',
  'reachForward',
  'overShoulder',
  'abduction',
  'shouldersStatic',
  'shouldersRapid',
  'push',
  'pull',
  'backFlexion',
  'backTwist',
  'backExtension',
  'backStatic',
  'backRapid',
  'lift',
  'pushPull',
  'neckFlexion',
  'neckTwist',
  'neckExtension',
  'neckStatic',
  'neckRapid',
  'squat',
  'kneel',
  'legsStatic',
  'legsRapid',
  'vibration',
  'extremeColdTemperature',
  'contactStress',
] as const

export type RiskFactorKey = (typeof RISK_FACTOR_KEYS)[number]

/** The 6 lines of the board, top to bottom. */
export const RISK_FACTOR_BODY_PARTS = [
  'hands',
  'elbows',
  'shoulders',
  'back',
  'neck',
  'legs',
] as const

export type RiskFactorBodyPart = (typeof RISK_FACTOR_BODY_PARTS)[number]

/** A body part, or the "Outros" block. */
export type RiskFactorGroup = RiskFactorBodyPart | 'other'

/** The 4 columns of a body part, left to right. */
export const RISK_FACTOR_COLUMNS = [
  'posture',
  'static',
  'repetition',
  'force',
] as const

export type RiskFactorColumn = (typeof RISK_FACTOR_COLUMNS)[number]

/** A column title: the body parts' one, then the 4 columns. */
export type RiskFactorColumnTitle = 'bodyPart' | RiskFactorColumn

/** A rectangle in fractions of the figure, from its top left corner. */
export interface RiskFactorBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Where an item's label goes in its box: below its drawing, or in the middle
 * of a cell without a drawing (Estático, Repetição, "Torção do antebraço /
 * Torque" and "Temperatura extremamente fria").
 */
export type RiskFactorLabelPlacement = 'below' | 'center'

export interface RiskFactorBoardItem {
  key: RiskFactorKey
  group: RiskFactorGroup
  /** `null` for the items of the "Outros" block. */
  column: RiskFactorColumn | null
  /** In `RISK_FACTOR_BOARD_NAMESPACE`. */
  labelKey: `items.${RiskFactorKey}`
  box: RiskFactorBox
  label: RiskFactorLabelPlacement
}

/** A box given in pixels of the figure, kept in fractions. */
function box(x: number, y: number, w: number, h: number): RiskFactorBox {
  const { width, height } = RISK_FACTOR_FIGURE

  return { x: x / width, y: y / height, w: w / width, h: h / height }
}

// The grid of the figure, in its pixels. Columns: body parts 0–62, Postura
// 62–181, Estático 181–220, Repetição 220–296 and Força 296–430. Lines: the
// titles 0–13, Mãos / Punhos 13–122, Cotovelos 122–169, Ombros 169–239,
// Costas 239–311, Pescoço 311–370 and Pernas 370–440. The "Outros" block
// takes Força from 311 down, inside a thicker border.

/** The cells of Estático and Repetição: no drawing, the label in the middle. */
const STATIC = { x: 183, w: 35 }
const REPETITION = { x: 222, w: 72 }

/** The 5 column titles, on the top line of the figure. */
export const RISK_FACTOR_COLUMN_TITLES = [
  { key: 'bodyPart', labelKey: 'columns.bodyPart', box: box(2, 1, 60, 12) },
  { key: 'posture', labelKey: 'columns.posture', box: box(63, 1, 118, 12) },
  { key: 'static', labelKey: 'columns.static', box: box(182, 1, 37, 12) },
  {
    key: 'repetition',
    labelKey: 'columns.repetition',
    box: box(221, 1, 74, 12),
  },
  { key: 'force', labelKey: 'columns.force', box: box(298, 1, 132, 12) },
] as const satisfies readonly {
  key: RiskFactorColumnTitle
  labelKey: `columns.${RiskFactorColumnTitle}`
  box: RiskFactorBox
}[]

/**
 * The names of the 6 body parts, in the first column. The "Outros" block has
 * no title on the figure, as in the legacy; its name only goes in the items'
 * accessible names.
 */
export const RISK_FACTOR_BODY_PART_TITLES = [
  { bodyPart: 'hands', labelKey: 'bodyParts.hands', box: box(2, 14, 60, 108) },
  {
    bodyPart: 'elbows',
    labelKey: 'bodyParts.elbows',
    box: box(2, 123, 60, 46),
  },
  {
    bodyPart: 'shoulders',
    labelKey: 'bodyParts.shoulders',
    box: box(2, 170, 60, 69),
  },
  { bodyPart: 'back', labelKey: 'bodyParts.back', box: box(2, 240, 60, 71) },
  { bodyPart: 'neck', labelKey: 'bodyParts.neck', box: box(2, 312, 60, 58) },
  { bodyPart: 'legs', labelKey: 'bodyParts.legs', box: box(2, 371, 60, 69) },
] as const satisfies readonly {
  bodyPart: RiskFactorBodyPart
  labelKey: `bodyParts.${RiskFactorBodyPart}`
  box: RiskFactorBox
}[]

/** The 39 items, in the order of `RISK_FACTOR_KEYS`. */
export const RISK_FACTOR_ITEMS = [
  // Mãos / Punhos: the four drawings of the wrist in two lines, then the
  // three grips of Força.
  {
    key: 'handsFlexion',
    group: 'hands',
    column: 'posture',
    labelKey: 'items.handsFlexion',
    box: box(64, 16, 56, 56),
    label: 'below',
  },
  {
    key: 'radialDeviation',
    group: 'hands',
    column: 'posture',
    labelKey: 'items.radialDeviation',
    box: box(120, 16, 60, 56),
    label: 'below',
  },
  {
    key: 'handsExtension',
    group: 'hands',
    column: 'posture',
    labelKey: 'items.handsExtension',
    box: box(64, 73, 56, 48),
    label: 'below',
  },
  {
    key: 'ulnarDeviation',
    group: 'hands',
    column: 'posture',
    labelKey: 'items.ulnarDeviation',
    box: box(120, 73, 60, 48),
    label: 'below',
  },
  {
    key: 'handsStatic',
    group: 'hands',
    column: 'static',
    labelKey: 'items.handsStatic',
    box: box(STATIC.x, 15, STATIC.w, 105),
    label: 'center',
  },
  {
    key: 'handsRapid',
    group: 'hands',
    column: 'repetition',
    labelKey: 'items.handsRapid',
    box: box(REPETITION.x, 15, REPETITION.w, 105),
    label: 'center',
  },
  {
    key: 'pinch',
    group: 'hands',
    column: 'force',
    labelKey: 'items.pinch',
    box: box(299, 16, 70, 58),
    label: 'below',
  },
  {
    key: 'grip',
    group: 'hands',
    column: 'force',
    labelKey: 'items.grip',
    box: box(371, 16, 57, 58),
    label: 'below',
  },
  {
    key: 'hammer',
    group: 'hands',
    column: 'force',
    labelKey: 'items.hammer',
    box: box(335, 76, 57, 44),
    label: 'below',
  },
  // Cotovelos: "Torção do antebraço / Torque" has no drawing, its label
  // takes the cell of Força.
  {
    key: 'supinationPronation',
    group: 'elbows',
    column: 'posture',
    labelKey: 'items.supinationPronation',
    box: box(64, 124, 115, 43),
    label: 'below',
  },
  {
    key: 'elbowsStatic',
    group: 'elbows',
    column: 'static',
    labelKey: 'items.elbowsStatic',
    box: box(STATIC.x, 124, STATIC.w, 43),
    label: 'center',
  },
  {
    key: 'elbowsRapid',
    group: 'elbows',
    column: 'repetition',
    labelKey: 'items.elbowsRapid',
    box: box(REPETITION.x, 124, REPETITION.w, 43),
    label: 'center',
  },
  {
    key: 'forearmTwist',
    group: 'elbows',
    column: 'force',
    labelKey: 'items.forearmTwist',
    box: box(299, 124, 129, 43),
    label: 'center',
  },
  // Ombros.
  {
    key: 'reachForward',
    group: 'shoulders',
    column: 'posture',
    labelKey: 'items.reachForward',
    box: box(64, 171, 41, 66),
    label: 'below',
  },
  {
    key: 'overShoulder',
    group: 'shoulders',
    column: 'posture',
    labelKey: 'items.overShoulder',
    box: box(105, 171, 42, 66),
    label: 'below',
  },
  {
    key: 'abduction',
    group: 'shoulders',
    column: 'posture',
    labelKey: 'items.abduction',
    box: box(147, 171, 33, 66),
    label: 'below',
  },
  {
    key: 'shouldersStatic',
    group: 'shoulders',
    column: 'static',
    labelKey: 'items.shouldersStatic',
    box: box(STATIC.x, 171, STATIC.w, 66),
    label: 'center',
  },
  {
    key: 'shouldersRapid',
    group: 'shoulders',
    column: 'repetition',
    labelKey: 'items.shouldersRapid',
    box: box(REPETITION.x, 171, REPETITION.w, 66),
    label: 'center',
  },
  {
    key: 'push',
    group: 'shoulders',
    column: 'force',
    labelKey: 'items.push',
    box: box(299, 171, 62, 66),
    label: 'below',
  },
  {
    key: 'pull',
    group: 'shoulders',
    column: 'force',
    labelKey: 'items.pull',
    box: box(361, 171, 67, 66),
    label: 'below',
  },
  // Costas.
  {
    key: 'backFlexion',
    group: 'back',
    column: 'posture',
    labelKey: 'items.backFlexion',
    box: box(64, 241, 40, 68),
    label: 'below',
  },
  {
    key: 'backTwist',
    group: 'back',
    column: 'posture',
    labelKey: 'items.backTwist',
    box: box(104, 241, 32, 68),
    label: 'below',
  },
  {
    key: 'backExtension',
    group: 'back',
    column: 'posture',
    labelKey: 'items.backExtension',
    box: box(136, 241, 44, 68),
    label: 'below',
  },
  {
    key: 'backStatic',
    group: 'back',
    column: 'static',
    labelKey: 'items.backStatic',
    box: box(STATIC.x, 241, STATIC.w, 68),
    label: 'center',
  },
  {
    key: 'backRapid',
    group: 'back',
    column: 'repetition',
    labelKey: 'items.backRapid',
    box: box(REPETITION.x, 241, REPETITION.w, 68),
    label: 'center',
  },
  {
    key: 'lift',
    group: 'back',
    column: 'force',
    labelKey: 'items.lift',
    box: box(299, 241, 62, 68),
    label: 'below',
  },
  {
    key: 'pushPull',
    group: 'back',
    column: 'force',
    labelKey: 'items.pushPull',
    box: box(361, 241, 67, 68),
    label: 'below',
  },
  // Pescoço: no Força.
  {
    key: 'neckFlexion',
    group: 'neck',
    column: 'posture',
    labelKey: 'items.neckFlexion',
    box: box(64, 313, 42, 55),
    label: 'below',
  },
  {
    key: 'neckTwist',
    group: 'neck',
    column: 'posture',
    labelKey: 'items.neckTwist',
    box: box(106, 313, 34, 55),
    label: 'below',
  },
  {
    key: 'neckExtension',
    group: 'neck',
    column: 'posture',
    labelKey: 'items.neckExtension',
    box: box(140, 313, 40, 55),
    label: 'below',
  },
  {
    key: 'neckStatic',
    group: 'neck',
    column: 'static',
    labelKey: 'items.neckStatic',
    box: box(STATIC.x, 313, STATIC.w, 55),
    label: 'center',
  },
  {
    key: 'neckRapid',
    group: 'neck',
    column: 'repetition',
    labelKey: 'items.neckRapid',
    box: box(REPETITION.x, 313, REPETITION.w, 55),
    label: 'center',
  },
  // Pernas: no Força.
  {
    key: 'squat',
    group: 'legs',
    column: 'posture',
    labelKey: 'items.squat',
    box: box(64, 372, 46, 66),
    label: 'below',
  },
  {
    key: 'kneel',
    group: 'legs',
    column: 'posture',
    labelKey: 'items.kneel',
    box: box(110, 372, 70, 66),
    label: 'below',
  },
  {
    key: 'legsStatic',
    group: 'legs',
    column: 'static',
    labelKey: 'items.legsStatic',
    box: box(STATIC.x, 372, STATIC.w, 66),
    label: 'center',
  },
  {
    key: 'legsRapid',
    group: 'legs',
    column: 'repetition',
    labelKey: 'items.legsRapid',
    box: box(REPETITION.x, 372, REPETITION.w, 66),
    label: 'center',
  },
  // Outros: "Temperatura extremamente fria" has no drawing, its label takes
  // the top right of the block.
  {
    key: 'vibration',
    group: 'other',
    column: null,
    labelKey: 'items.vibration',
    box: box(301, 316, 57, 60),
    label: 'below',
  },
  {
    key: 'extremeColdTemperature',
    group: 'other',
    column: null,
    labelKey: 'items.extremeColdTemperature',
    box: box(359, 316, 69, 60),
    label: 'center',
  },
  {
    key: 'contactStress',
    group: 'other',
    column: null,
    labelKey: 'items.contactStress',
    box: box(312, 378, 104, 61),
    label: 'below',
  },
] as const satisfies readonly RiskFactorBoardItem[]

// The items follow `RISK_FACTOR_KEYS` one by one: `tsc` fails on a key that
// is missing, extra or out of order.
type ItemKeys<T extends readonly { key: RiskFactorKey }[]> = {
  [I in keyof T]: T[I]['key']
}
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
type Assert<T extends true> = T
/** `true` when every item's text is `items.<its key>`. */
type LabelKeysMatch<T extends readonly RiskFactorBoardItem[]> = {
  [I in keyof T]: T[I]['labelKey'] extends `items.${T[I]['key']}` ? true : false
}[number]

export type RiskFactorItemsFollowKeys = Assert<
  Equals<ItemKeys<typeof RISK_FACTOR_ITEMS>, typeof RISK_FACTOR_KEYS>
>
export type RiskFactorItemsLabelKeys = Assert<
  Equals<LabelKeysMatch<typeof RISK_FACTOR_ITEMS>, true>
>
