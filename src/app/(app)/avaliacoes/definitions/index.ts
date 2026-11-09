import type { EvaluationType } from '@/lib/evaluation-types'

import { changeAssessmentDefinition } from './change-assessment'
import { checklistDefinition } from './checklist'
import { ergonomicAnalysisInLocoDefinition } from './ergonomic-analysis-in-loco'
import { ergonomicWorkAnalysisDefinition } from './ergonomic-work-analysis'
import { ergonomicWorkAnalysisAdvancedDefinition } from './ergonomic-work-analysis-advanced'
import { hitListDefinition } from './hit-list'
import { incidentInvestigationDefinition } from './incident-investigation'
import { priorityCriterionDefinition } from './priority-criterion'
import { procedureAssessmentDefinition } from './procedure-assessment'
import { riskFactorDefinition } from './risk-factor'
import type { EvaluationWebDefinition } from './types'

export { changeAssessmentDefinition } from './change-assessment'
export { checklistDefinition } from './checklist'
export { ergonomicAnalysisInLocoDefinition } from './ergonomic-analysis-in-loco'
export { ergonomicWorkAnalysisDefinition } from './ergonomic-work-analysis'
export { ergonomicWorkAnalysisAdvancedDefinition } from './ergonomic-work-analysis-advanced'
export { hitListDefinition } from './hit-list'
export { incidentInvestigationDefinition } from './incident-investigation'
export { priorityCriterionDefinition } from './priority-criterion'
export { procedureAssessmentDefinition } from './procedure-assessment'
export { riskFactorDefinition } from './risk-factor'
export type { EvaluationWebDefinition } from './types'

/**
 * The web definition of each evaluation type (FR-009). A type of the API
 * without a definition does not compile.
 */
const EVALUATION_WEB_DEFINITIONS = {
  ergonomic_analysis_in_loco: ergonomicAnalysisInLocoDefinition,
  risk_factor: riskFactorDefinition,
  ergonomic_work_analysis_advanced: ergonomicWorkAnalysisAdvancedDefinition,
  priority_criterion: priorityCriterionDefinition,
  hit_list: hitListDefinition,
  checklist: checklistDefinition,
  ergonomic_work_analysis: ergonomicWorkAnalysisDefinition,
  change_assessment: changeAssessmentDefinition,
  procedure_assessment: procedureAssessmentDefinition,
  incident_investigation: incidentInvestigationDefinition,
} as const satisfies Record<EvaluationType, EvaluationWebDefinition>

export function evaluationWebDefinition(
  type: EvaluationType
): EvaluationWebDefinition {
  return EVALUATION_WEB_DEFINITIONS[type]
}
