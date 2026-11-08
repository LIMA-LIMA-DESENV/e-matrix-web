'use client'

import { type EvaluationTypeItemType, useGetEvaluationsTypes } from '@/http/api'

export type EvaluationType = EvaluationTypeItemType

/**
 * The route of each evaluation type, in the order the API lists the enabled
 * ones (`ergonomic_analysis_in_loco`, `risk_factor`,
 * `ergonomic_work_analysis_advanced`, `priority_criterion`, `hit_list`,
 * `checklist`, `change_assessment`, the order of the legacy tabs):
 * `/avaliacoes` opens on the first enabled.
 */
export const EVALUATION_TYPE_HREFS = {
  ergonomic_analysis_in_loco: '/avaliacoes/coleta-de-dados-producao',
  risk_factor: '/avaliacoes/identificacao-de-riscos',
  ergonomic_work_analysis_advanced:
    '/avaliacoes/analise-ergonomica-do-trabalho-producao',
  priority_criterion: '/avaliacoes/criterio-de-prioridade',
  hit_list: '/avaliacoes/hit-list',
  checklist: '/avaliacoes/coleta-de-dados',
  change_assessment: '/avaliacoes/avaliacao-de-mudancas',
} as const satisfies Record<EvaluationType, string>

const EMPTY_TYPES: readonly EvaluationType[] = []

/**
 * The evaluation types enabled in this installation, asked to the API
 * (`GET /evaluations/types`, D-2) instead of a `NEXT_PUBLIC_*` variable, so
 * the screen never offers a type the API refuses.
 *
 * The answer only changes when the API restarts with another
 * `EVALUATION_TYPES`, so it is cached for the whole session: a change shows
 * after reloading the page. `types` is empty while loading and on an error,
 * which keeps the menu item hidden rather than offering a screen that would
 * answer 404.
 */
export function useEvaluationTypes() {
  const query = useGetEvaluationsTypes({
    query: { staleTime: Number.POSITIVE_INFINITY },
  })

  const types =
    query.data?.status === 200
      ? query.data.data.map((item) => item.type)
      : EMPTY_TYPES

  return {
    types,
    isLoaded: query.data?.status === 200,
    isError: query.isError,
    refetch: query.refetch,
  }
}
