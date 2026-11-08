import type {
  PriorityCriterionAnswers,
  PriorityCriterionInput,
} from '@/http/api'

/**
 * The Critério de Prioridade (`priority_criterion`, CP): its 5 questions, the
 * 5 categories of solutions and the 3 priority bands, in the order of the
 * legacy `prioritycriterion.pdf.twig` and of the API (FR-006, FR-007). The
 * web's single source of them, shared by the form and the PDF (FR-017).
 *
 * The points and the bands repeat the API's `constants.ts`, which derives the
 * saved `priority` (D-8, RK-1): a question stores the points of its option,
 * as in the legacy (D-3), and they are distinct within a question.
 *
 * The keys are the message keys of the labels, in
 * `evaluations.priorityCriterionQuestions`: `questions.<field>`,
 * `options.<option>`, `levels.<level>.priority` and `.action`, and
 * `categories.<answer>`.
 */
export const PRIORITY_CRITERION_QUESTIONS = [
  {
    field: 'question1',
    options: [
      { points: 0, key: 'noRisk' },
      { points: 1, key: 'hazard' },
      { points: 2, key: 'risk' },
      { points: 3, key: 'highRisk' },
    ],
  },
  {
    field: 'question2',
    options: [
      { points: 0, key: 'no' },
      { points: 1, key: 'yes' },
    ],
  },
  {
    field: 'question3',
    options: [
      { points: 0, key: 'no' },
      { points: 2, key: 'some' },
      { points: 4, key: 'frequent' },
    ],
  },
  {
    field: 'question4',
    options: [
      { points: 0, key: 'no' },
      { points: 1, key: 'yes' },
    ],
  },
  {
    field: 'question5',
    options: [
      { points: 0, key: 'no' },
      { points: 1, key: 'yes' },
    ],
  },
] as const

export type PriorityCriterionQuestion =
  (typeof PRIORITY_CRITERION_QUESTIONS)[number]

/** `question1` to `question5`, the header fields of the API. */
export type PriorityCriterionQuestionField = PriorityCriterionQuestion['field']

/** The message key of an option; "no" and "yes" are shared by questions. */
export type PriorityCriterionOptionKey =
  PriorityCriterionQuestion['options'][number]['key']

/** The points of the options of question `F`. */
export type PriorityCriterionPoints<F extends PriorityCriterionQuestionField> =
  Extract<PriorityCriterionQuestion, { field: F }>['options'][number]['points']

/**
 * The 5 categories of solutions, numbered as in the legacy table, each the
 * key of an optional text answer of the API catalog (FR-007).
 */
export const PRIORITY_CRITERION_CATEGORIES = [
  { number: 1, answer: 'solution1' },
  { number: 2, answer: 'solution2' },
  { number: 3, answer: 'solution3' },
  { number: 4, answer: 'solution4' },
  { number: 5, answer: 'solution5' },
] as const

/** `solution1` to `solution5`, the keys of the answers. */
export type PriorityCriterionSolutionKey =
  (typeof PRIORITY_CRITERION_CATEGORIES)[number]['answer']

/** `true` only when `A` and `B` are the same type, in both directions. */
type IsExactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type ContractQuestionField = Extract<
  keyof PriorityCriterionInput,
  `question${number}`
>

/**
 * The questions, their points and the solutions checked against the
 * generated contract (RK-1): `PriorityCriterionContractCheck` is `true` only
 * while the fields of the questions, the `enum` of the points of each one and
 * the keys of the solutions are exactly those of `PriorityCriterionInput` and
 * `PriorityCriterionAnswers`. After `yarn generate`, a divergence with the
 * API turns it `false`, and the assignment below fails the typecheck.
 */
export type PriorityCriterionContractCheck = IsExactly<
  | IsExactly<PriorityCriterionQuestionField, ContractQuestionField>
  | IsExactly<PriorityCriterionSolutionKey, keyof PriorityCriterionAnswers>
  | {
      [F in PriorityCriterionQuestionField]: IsExactly<
        PriorityCriterionPoints<F>,
        PriorityCriterionInput[F]
      >
    }[PriorityCriterionQuestionField],
  true
>

export const PRIORITY_CRITERION_MATCHES_CONTRACT: PriorityCriterionContractCheck = true

/**
 * The 3 priority bands of the sum, as the API's `PRIORITY_CRITERION_LEVELS`
 * (0–3, 4–6, 7–10), with the legacy color of each one in the ruler (H-10).
 * The text over it is black: its contrast is AA on all three (15.3, 19.6
 * and 5.3 to 1), while the legacy white over the red is 4.0 to 1 (NFR-008,
 * RK-3). `ruler` holds the numbers the legacy ruler prints under the band.
 */
export const PRIORITY_CRITERION_BANDS = [
  {
    level: 'low',
    min: 0,
    max: 3,
    color: '#00ff00',
    textColor: '#000000',
    ruler: ['1', '2', '3'],
  },
  {
    level: 'medium',
    min: 4,
    max: 6,
    color: '#ffff00',
    textColor: '#000000',
    ruler: ['4', '5', '6'],
  },
  {
    level: 'high',
    min: 7,
    max: 10,
    color: '#ff0000',
    textColor: '#000000',
    ruler: ['7', '8', '9 – 10'],
  },
] as const

/** `low`, `medium` or `high`, the `level` of the API's `priority`. */
export type PriorityCriterionLevel =
  (typeof PRIORITY_CRITERION_BANDS)[number]['level']

/** The band of a complete sum, from 0 to 10. */
export function priorityCriterionLevelOf(sum: number): PriorityCriterionLevel {
  const band = PRIORITY_CRITERION_BANDS.find(
    ({ min, max }) => sum >= min && sum <= max
  )
  // The sum of the valid points never leaves 0 to 10; above, it is high.
  return band?.level ?? 'high'
}

/**
 * The points answered to `question`, or `null`: anything but one of its own
 * points (no answer, a string, another number) is no answer.
 */
export function priorityCriterionAnswerOf(
  values: Readonly<Record<string, unknown>>,
  question: PriorityCriterionQuestion
): number | null {
  const value = values[question.field]
  return question.options.some(({ points }) => points === value)
    ? (value as number)
    : null
}

export interface PriorityCriterionScore {
  /** The sum of the answered points; partial while `missing` > 0. */
  sum: number
  /** The band of the sum, or `null` while a question has no answer. */
  level: PriorityCriterionLevel | null
  /** How many of the 5 questions have no answer. */
  missing: number
}

/**
 * The sum and the priority of the answers, with the rule of the API's
 * `presentPriorityCriterionScore` (FR-008, FR-017). With every question
 * answered, `level` is the band of the sum; with any missing, `sum` is the
 * partial sum and `level` is `null`, never the band of a partial sum (the
 * legacy counted a missing answer as 0). What was saved is the API's
 * `priority`; this is its preview while the form is filled.
 */
export function computePriorityCriterionScore(
  values: Readonly<Record<string, unknown>>
): PriorityCriterionScore {
  let sum = 0
  let missing = 0

  for (const question of PRIORITY_CRITERION_QUESTIONS) {
    const points = priorityCriterionAnswerOf(values, question)
    if (points === null) missing += 1
    else sum += points
  }

  return {
    sum,
    level: missing === 0 ? priorityCriterionLevelOf(sum) : null,
    missing,
  }
}
