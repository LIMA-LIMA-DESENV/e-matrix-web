'use client'

import {
  type ErgonomicAnalysisInLoco,
  type ErgonomicAnalysisInLocoInput,
  type ErgonomicAnalysisInLocoItem,
  getEvaluationsErgonomicAnalysesInLocoId,
  getGetEvaluationsErgonomicAnalysesInLocoIdQueryKey,
  getGetEvaluationsErgonomicAnalysesInLocoQueryKey,
  useDeleteEvaluationsErgonomicAnalysesInLocoId,
  useGetEvaluationsErgonomicAnalysesInLoco,
  useGetEvaluationsErgonomicAnalysesInLocoActivities,
  useGetEvaluationsErgonomicAnalysesInLocoId,
  usePostEvaluationsErgonomicAnalysesInLoco,
  usePutEvaluationsErgonomicAnalysesInLocoId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ErgonomicAnalysisInLocoForm } from '../_form/ErgonomicAnalysisInLocoForm'
import {
  type ErgonomicAnalysisInLocoFormData,
  ergonomicAnalysisInLocoFormDefaultValues,
  makeErgonomicAnalysisInLocoSchema,
  toErgonomicAnalysisInLocoFormValues,
  toErgonomicAnalysisInLocoInput,
} from '../_form/schema'
import { ergonomicAnalysisInLocoPdfAdapter } from './ergonomic-analysis-in-loco-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Coleta de Dados In Loco — Produção (CDIP) has no name of its own, but
 * a required sector: its rows show the sector, which tells the records apart
 * better than the repeated type (D-6, H-3).
 */
export const ergonomicAnalysisInLocoDefinition: EvaluationWebDefinition<
  ErgonomicAnalysisInLocoItem,
  ErgonomicAnalysisInLoco,
  ErgonomicAnalysisInLocoFormData,
  ErgonomicAnalysisInLocoInput
> = {
  type: 'ergonomic_analysis_in_loco',
  href: EVALUATION_TYPE_HREFS.ergonomic_analysis_in_loco,
  typeLabel: (t) => t('types.ergonomic_analysis_in_loco'),
  newLabel: (t) => t('newErgonomicAnalysisInLoco'),
  rowName: (item) => item.sector,
  useList() {
    const query = useGetEvaluationsErgonomicAnalysesInLoco()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsErgonomicAnalysesInLocoId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicAnalysesInLocoId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicAnalysesInLocoActivities({
        query: { enabled },
      })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(
      usePostEvaluationsErgonomicAnalysesInLoco()
    )
  },
  useUpdate() {
    return toEvaluationUpdateMutation(
      usePutEvaluationsErgonomicAnalysesInLocoId()
    )
  },
  useDelete() {
    return useDeleteEvaluationsErgonomicAnalysesInLocoId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsErgonomicAnalysesInLocoQueryKey(),
  detailQueryKey: (id) =>
    getGetEvaluationsErgonomicAnalysesInLocoIdQueryKey(id),
  form: {
    Component: ErgonomicAnalysisInLocoForm,
    makeSchema: makeErgonomicAnalysisInLocoSchema,
    defaultValues: ergonomicAnalysisInLocoFormDefaultValues,
    toFormValues: toErgonomicAnalysisInLocoFormValues,
    toInput: toErgonomicAnalysisInLocoInput,
  },
  pdf: ergonomicAnalysisInLocoPdfAdapter,
  fileBaseName: 'coleta-de-dados-producao',
}
