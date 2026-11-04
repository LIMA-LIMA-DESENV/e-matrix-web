import type { ChangeAssessmentAnswers } from '@/http/api'

/**
 * The 8 open questions of the Avaliação de Mudanças / Projetos, in the order
 * of the legacy `changeassessment.pdf.twig`: the API answer keys, which are
 * also the message keys of their texts
 * (`evaluations.pdf.changeAssessment.questions.<key>`). The web's single list,
 * shared by the PDF and the form.
 */
export const CHANGE_ASSESSMENT_QUESTIONS = [
  'question1',
  'question2',
  'question3',
  'question4',
  'question5',
  'question6',
  'question7',
  'question8',
] as const satisfies readonly (keyof ChangeAssessmentAnswers)[]

export type ChangeAssessmentQuestion =
  (typeof CHANGE_ASSESSMENT_QUESTIONS)[number]
