'use client'

import { ViewEvaluationPage } from '../../_form/ViewEvaluation'

/**
 * Shows an Análise Ergonômica do Trabalho – Produção, read only, to every
 * role (J2).
 */
export default function EvaluationDetailRoutePage() {
  return <ViewEvaluationPage type="ergonomic_work_analysis_advanced" />
}
