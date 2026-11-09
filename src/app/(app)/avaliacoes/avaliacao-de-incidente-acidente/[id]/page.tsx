'use client'

import { ViewEvaluationPage } from '../../_form/ViewEvaluation'

/** Shows an Avaliação de Incidente / Acidente, read only, to every role (J2). */
export default function EvaluationDetailRoutePage() {
  return <ViewEvaluationPage type="incident_investigation" />
}
