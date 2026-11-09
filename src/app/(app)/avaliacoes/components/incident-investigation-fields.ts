/**
 * The Avaliação de Incidente / Acidente (`incident_investigation`, II): the
 * web's single source of its answers, of the limit of the one-line ones and of
 * the 6 ergonomic risk factors, shared by the form and the PDF (FR-014). No
 * React.
 */

import type { IncidentInvestigationAnswers } from '@/http/api'

/** The answers, with the legacy keys, in the order of the API catalog. */
export const INCIDENT_INVESTIGATION_ANSWERS = [
  'sector',
  'employee',
  'ergonomicRiskFactors',
  'comments',
] as const

export type IncidentInvestigationAnswer =
  (typeof INCIDENT_INVESTIGATION_ANSWERS)[number]

/** The limit of `sector` and `employee`, in code points, as in the API. */
export const INCIDENT_INVESTIGATION_SHORT_TEXT_MAX_LENGTH = 255

/**
 * The 6 factors, in the legacy order. They are fixed reference labels beside
 * the single `ergonomicRiskFactors` text: nothing marks them, the API does not
 * know them and they hold no data (D-5). Each is also its message key, in
 * `evaluations.incidentInvestigationFields.riskFactors`.
 */
export const INCIDENT_INVESTIGATION_RISK_FACTORS = [
  'excessiveForce',
  'inadequatePosture',
  'highRepetition',
  'vibration',
  'contactStress',
  'extremeTemperatures',
] as const

export type IncidentInvestigationRiskFactor =
  (typeof INCIDENT_INVESTIGATION_RISK_FACTORS)[number]

type IsExactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

/**
 * The answers checked against the generated contract (FR-014):
 * `IncidentInvestigationContractCheck` is `true` only while the keys are exactly
 * those of `IncidentInvestigationAnswers`. After `yarn generate`, a divergence
 * with the API turns it `false`, and the assignment below fails the typecheck.
 */
export type IncidentInvestigationContractCheck = IsExactly<
  IncidentInvestigationAnswer,
  keyof IncidentInvestigationAnswers
>

export const INCIDENT_INVESTIGATION_MATCHES_CONTRACT: IncidentInvestigationContractCheck = true
