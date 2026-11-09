'use client'

import { ViewEvaluationPage } from '../../_form/ViewEvaluation'

/** Shows an Avaliação de Risco Ergonômico de Tarefas, read only, to every role (J2). */
export default function EvaluationDetailRoutePage() {
  return <ViewEvaluationPage type="procedure_assessment" />
}
