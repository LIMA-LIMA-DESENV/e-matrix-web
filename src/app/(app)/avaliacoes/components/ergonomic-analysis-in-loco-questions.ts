import type { ErgonomicAnalysisInLocoAnswers } from '@/http/api'

/**
 * The 20 open questions of the Coleta de Dados In Loco — Produção, in the
 * order of the legacy `ergonomicanalysisinloco.pdf.twig` (R-7): the API answer
 * keys, with the legacy camelCase and its spelling (D-3), which are also the
 * message keys of their texts
 * (`evaluations.pdf.ergonomicAnalysisInLoco.questions.<key>`). The web's
 * single list, shared by the PDF and the form.
 */
export const ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS = [
  'numberOfStaff',
  'scheduleOfWork',
  'description',
  'descriptionRelatedActivities',
  'timesPerShift',
  'totalTime',
  'descriptionCompensatoryMechanisms',
  'descriptionProcessSteps',
  'repeatability',
  'riskFactor',
  'dimensions',
  'videoMonitor',
  'monotonous',
  'stress',
  'productivityControl',
  'dificulties',
  'ilumination',
  'sugestions',
  'improvementsAlreadyMade',
  'measuresForErgonomicToolApplication',
] as const satisfies readonly (keyof ErgonomicAnalysisInLocoAnswers)[]

export type ErgonomicAnalysisInLocoQuestion =
  (typeof ERGONOMIC_ANALYSIS_IN_LOCO_QUESTIONS)[number]

/** Questions 5 to 7, side by side under "Tempos e ciclos". */
export const ERGONOMIC_ANALYSIS_IN_LOCO_TIMES_AND_CYCLES = [
  'timesPerShift',
  'totalTime',
  'descriptionCompensatoryMechanisms',
] as const satisfies readonly ErgonomicAnalysisInLocoQuestion[]

/**
 * The 5 steps of the guide of question 8, in the legacy order; the message
 * keys of their texts (`evaluations.pdf.ergonomicAnalysisInLoco.processSteps.<key>`).
 */
export const ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS = [
  'description',
  'duration',
  'rhythm',
  'physicalEffort',
  'manualHandling',
] as const

export type ErgonomicAnalysisInLocoProcessStep =
  (typeof ERGONOMIC_ANALYSIS_IN_LOCO_PROCESS_STEPS)[number]
