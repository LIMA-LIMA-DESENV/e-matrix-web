import type { NavKey } from '@/components/shell/nav-items'

import type messages from '../../../messages/pt-BR.json'

type TourStepMessages = (typeof messages)['tour']['steps']

/** A step of the guided tour, named as in `tour.steps.<key>`. */
export type TourStepKey = keyof TourStepMessages

/** A paragraph of a step, as a key of the `tour` namespace. */
export type TourParagraphKey = {
  [K in TourStepKey]: `steps.${K}.${Exclude<
    keyof TourStepMessages[K] & string,
    'title'
  >}`
}[TourStepKey]

/**
 * What the step points at: nothing, the whole sidebar or the menu item of a
 * module. The shells mark these with `data-tour-target`.
 */
export type TourTarget = 'none' | 'sidebar' | `nav:${NavKey}`

/**
 * The title of the card: the greeting (`steps.welcome.title`), the product
 * (`appTitle`) or a module, named as in the menu (`moduleTitle` over `nav`).
 */
export type TourTitle =
  | { type: 'greeting' }
  | { type: 'app' }
  | { type: 'module'; nav: NavKey }

export interface TourParagraph {
  key: TourParagraphKey
  /** Only true where the sidebar collapses, the classic layout. */
  classicOnly?: boolean
}

export interface TourStep {
  key: TourStepKey
  /** The screen the step opens; the path may go on after it (redirects). */
  route: string
  target: TourTarget
  title: TourTitle
  paragraphs: readonly TourParagraph[]
}

export interface TourAudience {
  /** Parâmetros is an administrator's screen. */
  isAdmin: boolean
  /** Avaliações is in the menu: the API enables at least one type. */
  hasEvaluations: boolean
}

function moduleStep(
  key: TourStepKey,
  nav: NavKey,
  route: string,
  paragraphs: readonly TourParagraphKey[]
): TourStep {
  return {
    key,
    route,
    target: `nav:${nav}`,
    title: { type: 'module', nav },
    paragraphs: paragraphs.map((paragraph) => ({ key: paragraph })),
  }
}

/**
 * The steps of the tour, in the legacy order, for who is taking it. Without
 * React: the caller reads the role and the menu once, at the start, and keeps
 * the list until the tour ends.
 */
export function buildTourSteps({
  isAdmin,
  hasEvaluations,
}: TourAudience): TourStep[] {
  const steps: (TourStep | false)[] = [
    {
      key: 'welcome',
      route: '/dashboard',
      target: 'none',
      title: { type: 'greeting' },
      paragraphs: [{ key: 'steps.welcome.body' }],
    },
    {
      key: 'navigation',
      route: '/dashboard',
      target: 'sidebar',
      title: { type: 'app' },
      paragraphs: [
        { key: 'steps.navigation.body' },
        { key: 'steps.navigation.collapseHint', classicOnly: true },
      ],
    },
    moduleStep('managementPlan', 'managementPlan', '/plano-de-gestao', [
      'steps.managementPlan.body',
    ]),
    moduleStep('programs', 'programs', '/programa', [
      'steps.programs.intro',
      'steps.programs.items',
      'steps.programs.score',
    ]),
    moduleStep('documents', 'documents', '/documentos', [
      'steps.documents.body',
    ]),
    moduleStep('projects', 'projects', '/projetos', ['steps.projects.body']),
    moduleStep('trainings', 'trainings', '/treinamentos', [
      'steps.trainings.materials',
      'steps.trainings.record',
    ]),
    moduleStep('meetings', 'meetings', '/reunioes', ['steps.meetings.body']),
    hasEvaluations &&
      moduleStep('evaluations', 'evaluations', '/avaliacoes', [
        'steps.evaluations.scope',
        'steps.evaluations.database',
      ]),
    // The Gráficos tab, as in the legacy.
    moduleStep('matrix', 'matrix', '/matriz/graficos', [
      'steps.matrix.result',
      'steps.matrix.maps',
      'steps.matrix.filter',
    ]),
    isAdmin &&
      moduleStep('parameters', 'parameters', '/parametros', [
        'steps.parameters.body',
      ]),
    {
      key: 'farewell',
      route: '/dashboard',
      target: 'none',
      title: { type: 'app' },
      paragraphs: [{ key: 'steps.farewell.body' }],
    },
  ]

  return steps.filter((step) => step !== false)
}
