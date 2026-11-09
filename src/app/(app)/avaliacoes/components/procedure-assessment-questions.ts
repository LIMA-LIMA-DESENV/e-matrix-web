import type {
  ProcedureAssessmentAnswers,
  ProcedureAssessmentInput,
} from '@/http/api'

/**
 * The Avaliação de Risco Ergonômico de Tarefas (`procedure_assessment`, AP):
 * its 5 questions, in the order of the legacy `procedureassessment.pdf.twig`
 * and of the API, and the answers Sim (`1`) and Não (`0`), as the API stores
 * them (FR-003). The web's single source of them, shared by the form and the
 * PDF (FR-014).
 *
 * `field` is the question in the API and `commentKey` its comment in
 * `answers`. The message keys are relative to
 * `evaluations.procedureAssessmentQuestions`.
 */
export const PROCEDURE_ASSESSMENT_QUESTIONS = [
  {
    field: 'question1',
    commentKey: 'question1Description',
    questionKey: 'questions.question1',
    commentLabelKey: 'comments.question1Description',
  },
  {
    field: 'question2',
    commentKey: 'question2Description',
    questionKey: 'questions.question2',
    commentLabelKey: 'comments.question2Description',
  },
  {
    field: 'question3',
    commentKey: 'question3Description',
    questionKey: 'questions.question3',
    commentLabelKey: 'comments.question3Description',
  },
  {
    field: 'question4',
    commentKey: 'question4Description',
    questionKey: 'questions.question4',
    commentLabelKey: 'comments.question4Description',
  },
  {
    field: 'question5',
    commentKey: 'question5Description',
    questionKey: 'questions.question5',
    commentLabelKey: 'comments.question5Description',
  },
] as const

export const PROCEDURE_ASSESSMENT_OPTIONS = [
  { value: 1, labelKey: 'options.yes' },
  { value: 0, labelKey: 'options.no' },
] as const

export type ProcedureAssessmentQuestionField =
  (typeof PROCEDURE_ASSESSMENT_QUESTIONS)[number]['field']

export type ProcedureAssessmentCommentKey =
  (typeof PROCEDURE_ASSESSMENT_QUESTIONS)[number]['commentKey']

export type ProcedureAssessmentAnswer =
  (typeof PROCEDURE_ASSESSMENT_OPTIONS)[number]['value']

/** `true` only when `A` and `B` are the same type, in both directions. */
type IsExactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type ContractQuestionField = Extract<
  keyof ProcedureAssessmentInput,
  `question${number}`
>

/**
 * The questions, the options and the comments checked against the generated
 * contract (§15): `ProcedureAssessmentContractCheck` is `true` only while the
 * fields of the questions, the `enum` of each one's answers and the keys of
 * the comments are exactly those of `ProcedureAssessmentInput` and
 * `ProcedureAssessmentAnswers`. After `yarn generate`, a divergence with the
 * API turns it `false`, and the assignment below fails the typecheck.
 */
export type ProcedureAssessmentContractCheck = IsExactly<
  | IsExactly<ProcedureAssessmentQuestionField, ContractQuestionField>
  | IsExactly<ProcedureAssessmentCommentKey, keyof ProcedureAssessmentAnswers>
  | {
      [F in ProcedureAssessmentQuestionField]: IsExactly<
        ProcedureAssessmentAnswer,
        ProcedureAssessmentInput[F]
      >
    }[ProcedureAssessmentQuestionField],
  true
>

export const PROCEDURE_ASSESSMENT_MATCHES_CONTRACT: ProcedureAssessmentContractCheck = true
