/**
 * The answers of the Análise Ergonômica do Trabalho – Escritório (AETA), in
 * the order of the legacy `ergonomicworkanalysis.pdf.twig` and of the API
 * catalog (FR-006), with the legacy camelCase keys. The web's single list of
 * its fields, their tables, the measures' units, rules and reference values,
 * shared by the form and the PDF (FR-014). No React.
 *
 * The keys are also the message keys of their labels:
 * - the form's, in `evaluations.ergonomicWorkAnalysisFields`:
 *   `answers.<answer>`, `tables.<table>`, `units.<measure>` and
 *   `references.<measure>`;
 * - the report's, in `evaluations.pdf.ergonomicWorkAnalysis`: the legacy
 *   headers (`tables.<table>.title` and `tables.<table>.columns.<answer>`),
 *   with the same units and references.
 */

/** The three tables of the legacy report, each with its answers in order. */
export const ERGONOMIC_WORK_ANALYSIS_TABLES = {
  /** "Configurações básicas … | Postura de trabalho | Fatores biomecânicos". */
  workstation: [
    'basicConfigurationsStation',
    'workPosture',
    'biomechanicalFactors',
  ],
  /** "Tabela de Análise Ergonômica Avançada" (H-7). */
  advancedAnalysis: [
    'sector',
    'globalClassificationWorkStation',
    'changeNeeded',
  ],
  /** "Tabela de Análise do Ambiente Físico": the 5 measures. */
  physicalEnvironment: [
    'luminosity',
    'noise',
    'airSpeed',
    'effectiveTemperature',
    'airHumidity',
  ],
} as const

export type ErgonomicWorkAnalysisTable =
  keyof typeof ERGONOMIC_WORK_ANALYSIS_TABLES

export type ErgonomicWorkAnalysisTableAnswer<
  T extends ErgonomicWorkAnalysisTable,
> = (typeof ERGONOMIC_WORK_ANALYSIS_TABLES)[T][number]

/** The 11 answers, in the order of the API catalog (FR-006). */
export const ERGONOMIC_WORK_ANALYSIS_ANSWERS = [
  ...ERGONOMIC_WORK_ANALYSIS_TABLES.workstation,
  ...ERGONOMIC_WORK_ANALYSIS_TABLES.advancedAnalysis,
  ...ERGONOMIC_WORK_ANALYSIS_TABLES.physicalEnvironment,
] as const

export type ErgonomicWorkAnalysisAnswer =
  (typeof ERGONOMIC_WORK_ANALYSIS_ANSWERS)[number]

/** The 5 measures of the physical environment, all optional numbers. */
export type ErgonomicWorkAnalysisMeasure =
  ErgonomicWorkAnalysisTableAnswer<'physicalEnvironment'>

/** The 6 plain texts, all optional. */
export type ErgonomicWorkAnalysisTextAnswer = Exclude<
  ErgonomicWorkAnalysisAnswer,
  ErgonomicWorkAnalysisMeasure
>

export const ERGONOMIC_WORK_ANALYSIS_TEXT_ANSWERS = [
  ...ERGONOMIC_WORK_ANALYSIS_TABLES.workstation,
  ...ERGONOMIC_WORK_ANALYSIS_TABLES.advancedAnalysis,
] as const satisfies readonly ErgonomicWorkAnalysisTextAnswer[]

export const ERGONOMIC_WORK_ANALYSIS_MEASURE_ANSWERS =
  ERGONOMIC_WORK_ANALYSIS_TABLES.physicalEnvironment

/**
 * The sector is one line of at most this many code points (FR-006, H-4); the
 * other texts have the evaluations' 5,000.
 */
export const ERGONOMIC_WORK_ANALYSIS_SECTOR_MAX_LENGTH = 255

/** An integer measure has at most this value, as the API (FR-001). */
export const ERGONOMIC_WORK_ANALYSIS_MAX_INTEGER = 2147483647

/**
 * The rule of a measure, the web's copy of the API's `rules` (FR-001,
 * FR-006): without `signed`, at least zero; `integer`, a whole number of at
 * most `ERGONOMIC_WORK_ANALYSIS_MAX_INTEGER`; `max`, at most that value.
 * `signed` is the API's `allowNegative` and the option of
 * `parseLocaleDecimal`.
 */
export interface ErgonomicWorkAnalysisMeasureRule {
  integer?: true
  signed?: true
  max?: number
}

export interface ErgonomicWorkAnalysisMeasureField {
  /** Message key of the unit, under `evaluations.ergonomicWorkAnalysisFields`. */
  unitKey: `units.${ErgonomicWorkAnalysisMeasure}`
  rule: ErgonomicWorkAnalysisMeasureRule
  /**
   * Message key of the fixed reference value, under
   * `evaluations.ergonomicWorkAnalysisFields`: a translated text, not a
   * number, since only the decimal separator changes by language (D-4, H-3).
   */
  referenceKey: `references.${ErgonomicWorkAnalysisMeasure}`
}

/**
 * Each measure's unit, rule and reference, in the order of the report. The
 * references are only shown: no measure is refused or highlighted for being
 * out of its reference (R-13).
 */
export const ERGONOMIC_WORK_ANALYSIS_MEASURES = {
  luminosity: {
    unitKey: 'units.luminosity',
    rule: { integer: true },
    referenceKey: 'references.luminosity',
  },
  noise: {
    unitKey: 'units.noise',
    rule: { integer: true },
    referenceKey: 'references.noise',
  },
  airSpeed: {
    unitKey: 'units.airSpeed',
    rule: {},
    referenceKey: 'references.airSpeed',
  },
  effectiveTemperature: {
    unitKey: 'units.effectiveTemperature',
    rule: { signed: true },
    referenceKey: 'references.effectiveTemperature',
  },
  airHumidity: {
    unitKey: 'units.airHumidity',
    rule: { max: 100 },
    referenceKey: 'references.airHumidity',
  },
} as const satisfies {
  [M in ErgonomicWorkAnalysisMeasure]: ErgonomicWorkAnalysisMeasureField & {
    unitKey: `units.${M}`
    referenceKey: `references.${M}`
  }
}
