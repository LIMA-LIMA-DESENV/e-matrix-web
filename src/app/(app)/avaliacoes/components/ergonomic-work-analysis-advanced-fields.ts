/**
 * The answers of the Análise Ergonômica do Trabalho – Produção (AETP), in the
 * order of the legacy `ergonomicworkanalysisadvanced.pdf.twig` and of the API
 * catalog (FR-012), with the legacy camelCase and its spelling
 * (`recomendations`). The web's single list of its fields and columns, shared
 * by the form and the PDF (FR-022).
 *
 * The keys are also the message keys of their labels:
 * - the form's, in `evaluations.ergonomicWorkAnalysisAdvancedFields`:
 *   `answers.<text answer>`, `tables.<table>.title` and
 *   `tables.<table>.columns.<column>`;
 * - the report's, in `evaluations.pdf.ergonomicWorkAnalysisAdvanced`: the
 *   legacy titles (`tables.<table>.title` and `tables.<table>.columns.<column>`,
 *   `description`, `resultsAndConclusions`, `recomendations`), while the 7
 *   complementary data keep the form's labels, which are the legacy ones.
 */
export const ERGONOMIC_WORK_ANALYSIS_ADVANCED_ANSWERS = [
  'description',
  'steps',
  'analyzedActivities',
  'complementaryData1',
  'complementaryData2',
  'complementaryData3',
  'complementaryData4',
  'complementaryData5',
  'complementaryData6',
  'complementaryData7',
  'resultsAndConclusions',
  'recomendations',
] as const

export type ErgonomicWorkAnalysisAdvancedAnswer =
  (typeof ERGONOMIC_WORK_ANALYSIS_ADVANCED_ANSWERS)[number]

/**
 * The columns of each table of rows, in the legacy order: "Etapas do
 * processo" and "Atividades analisadas" (the legacy "Tabela de Análise
 * Ergonômica Avançada").
 */
export const ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS = {
  steps: ['step', 'posture', 'biomechanicalFactors'],
  analyzedActivities: [
    'analyzedActivity',
    'workedTime',
    'ergonomicTool',
    'result',
  ],
} as const satisfies Partial<
  Record<ErgonomicWorkAnalysisAdvancedAnswer, readonly string[]>
>

export type ErgonomicWorkAnalysisAdvancedTable =
  keyof typeof ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS

export type ErgonomicWorkAnalysisAdvancedColumn<
  T extends ErgonomicWorkAnalysisAdvancedTable,
> = (typeof ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS)[T][number]

/** The tables, in the order of the report. */
export const ERGONOMIC_WORK_ANALYSIS_ADVANCED_TABLES = [
  'steps',
  'analyzedActivities',
] as const satisfies readonly ErgonomicWorkAnalysisAdvancedTable[]

/** A row of a table: one text per column, `''` or `null` when blank. */
export type ErgonomicWorkAnalysisAdvancedRow<
  T extends ErgonomicWorkAnalysisAdvancedTable,
> = Record<ErgonomicWorkAnalysisAdvancedColumn<T>, string | null>

/** The answers that are a single text. */
export type ErgonomicWorkAnalysisAdvancedTextAnswer = Exclude<
  ErgonomicWorkAnalysisAdvancedAnswer,
  ErgonomicWorkAnalysisAdvancedTable
>

export const ERGONOMIC_WORK_ANALYSIS_ADVANCED_TEXT_ANSWERS =
  ERGONOMIC_WORK_ANALYSIS_ADVANCED_ANSWERS.filter(
    (key): key is ErgonomicWorkAnalysisAdvancedTextAnswer =>
      !(key in ERGONOMIC_WORK_ANALYSIS_ADVANCED_ROW_COLUMNS)
  )

/** The 7 lines of "Dados complementares", label beside text. */
export const ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA = [
  'complementaryData1',
  'complementaryData2',
  'complementaryData3',
  'complementaryData4',
  'complementaryData5',
  'complementaryData6',
  'complementaryData7',
] as const satisfies readonly ErgonomicWorkAnalysisAdvancedTextAnswer[]

export type ErgonomicWorkAnalysisAdvancedComplementaryData =
  (typeof ERGONOMIC_WORK_ANALYSIS_ADVANCED_COMPLEMENTARY_DATA)[number]

/** At most this many rows per table, as the API (H-4). */
export const MAX_EVALUATION_ROWS = 30
