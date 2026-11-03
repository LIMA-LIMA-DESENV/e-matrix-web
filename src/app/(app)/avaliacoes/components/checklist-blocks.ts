import type {
  ChecklistAnswers,
  ChecklistBlockScore,
  ChecklistScore,
} from '@/http/api'

export type ChecklistBlockName = ChecklistBlockScore['block']

/**
 * The 11 blocks of the Coleta de Dados In Loco, in the order of the legacy
 * form and of the API score, with their questions and the ones whose expected
 * answer is "no" (`equal: false` in the legacy `checklist.pdf.twig`, the
 * `ratedValue` of `CheckList::calculate`). The web's single source of the
 * points of each option, shared by the PDF and the form (D-3): the expected
 * answer is worth 1, the other 0.
 */
export const CHECKLIST_BLOCKS = [
  { block: 'layout', questions: [1, 2, 3], expectedNo: [3] },
  {
    block: 'physical_environment',
    questions: [4, 5, 6, 7, 8],
    expectedNo: [6, 7, 8],
  },
  { block: 'posture', questions: [9, 10, 11, 12, 13], expectedNo: [12, 13] },
  { block: 'work_organization', questions: [14, 15, 16], expectedNo: [] },
  { block: 'chair', questions: [17, 18, 19, 20, 21, 22, 23], expectedNo: [] },
  {
    block: 'monitor',
    questions: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
    expectedNo: [30, 31, 32, 33, 34],
  },
  {
    block: 'desk',
    questions: [35, 36, 37, 38, 39, 40, 41, 42],
    expectedNo: [],
  },
  { block: 'keyboard', questions: [43, 44], expectedNo: [] },
  { block: 'cabinet_cpu', questions: [45, 46, 47], expectedNo: [45, 46, 47] },
  { block: 'accessories', questions: [48, 49, 50, 51, 52], expectedNo: [] },
  { block: 'laptop', questions: [53, 54, 55], expectedNo: [] },
] as const satisfies readonly {
  block: ChecklistBlockName
  questions: readonly number[]
  expectedNo: readonly number[]
}[]

export type ChecklistQuestionNumber =
  (typeof CHECKLIST_BLOCKS)[number]['questions'][number]

/** `question1` to `question55`, the keys of the answers. */
export type ChecklistQuestionKey = `question${ChecklistQuestionNumber}`

/** The 55 question keys, in the order of the blocks. */
export const CHECKLIST_QUESTION_KEYS: readonly ChecklistQuestionKey[] =
  CHECKLIST_BLOCKS.flatMap(({ questions }) =>
    questions.map((n): ChecklistQuestionKey => `question${n}`)
  )

/** The answer that scores the point of question `n`. */
export function checklistExpectedAnswer(n: ChecklistQuestionNumber) {
  return !CHECKLIST_BLOCKS.some(({ expectedNo }) =>
    (expectedNo as readonly number[]).includes(n)
  )
}

/** A yes/no answer: anything but a boolean is no answer. */
export function checklistAnswerOf(
  answers: ChecklistAnswers | Readonly<Record<string, unknown>>,
  n: ChecklistQuestionNumber
) {
  const value = (answers as Readonly<Record<string, unknown>>)[`question${n}`]
  return typeof value === 'boolean' ? value : null
}

/** Rounded as the API rounds the score (`roundTwoDecimals`, RK-1). */
function roundTwoDecimals(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * The score of a Coleta de Dados with the rule of the API's
 * `presentChecklistScore` (FR-013, D-3): a question scores a point when its
 * answer equals the expected one, so no answer never scores; each block's
 * percentage is sum/total × 100 and the average is the mean of the 11 block
 * ratios, both rounded to two decimals. Without any answered question the
 * percentages and the average are `null` (blank). What was saved is the
 * API's `score`; this is its preview while the form is filled.
 */
export function computeChecklistScore(
  answers: Readonly<Record<string, unknown>>
): ChecklistScore {
  const answered = CHECKLIST_BLOCKS.some(({ questions }) =>
    questions.some((n) => checklistAnswerOf(answers, n) !== null)
  )

  const blocks = CHECKLIST_BLOCKS.map(({ block, questions }) => {
    const sum = questions.filter(
      (n) => checklistAnswerOf(answers, n) === checklistExpectedAnswer(n)
    ).length

    return {
      block,
      sum,
      total: questions.length,
      ratio: sum / questions.length,
    }
  })

  const sumOfRatios = blocks.reduce((sum, { ratio }) => sum + ratio, 0)

  return {
    blocks: blocks.map(
      ({ block, sum, total, ratio }): ChecklistBlockScore => ({
        block,
        sum,
        total,
        percentage: answered ? roundTwoDecimals(ratio * 100) : null,
      })
    ),
    average: answered
      ? roundTwoDecimals((sumOfRatios / blocks.length) * 100)
      : null,
  }
}

type NumberFormatter = (
  value: number,
  options: { maximumFractionDigits: number }
) => string

/**
 * `60%`, `96,36%` in pt-BR and es, `96.36%` in en: at most two decimals, in
 * the user's language (`useFormatter().number`); `null` is blank. The PDF and
 * the form show the percentages alike.
 */
export function formatChecklistPercentage(
  formatNumber: NumberFormatter,
  value: number | null | undefined
) {
  if (typeof value !== 'number') return ''
  return `${formatNumber(value, { maximumFractionDigits: 2 })}%`
}
