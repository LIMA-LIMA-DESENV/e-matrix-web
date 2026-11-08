'use client'

import {
  getEvaluationsRiskFactorsId,
  getGetEvaluationsRiskFactorsIdQueryKey,
  getGetEvaluationsRiskFactorsQueryKey,
  type RiskFactor,
  type RiskFactorInput,
  type RiskFactorItem,
  useDeleteEvaluationsRiskFactorsId,
  useGetEvaluationsRiskFactors,
  useGetEvaluationsRiskFactorsActivities,
  useGetEvaluationsRiskFactorsId,
  usePostEvaluationsRiskFactors,
  usePutEvaluationsRiskFactorsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { RiskFactorForm } from '../_form/RiskFactorForm'
import {
  makeRiskFactorSchema,
  type RiskFactorFormValues,
  riskFactorFormDefaultValues,
  toRiskFactorFormValues,
  toRiskFactorInput,
} from '../_form/schema'
import { riskFactorPdfAdapter } from './risk-factor-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Identificação de Riscos (FR) has no name nor sector of its own, but a
 * required valuer: its rows show the valuer, which tells the records apart
 * better than the repeated type (D-7, H-3).
 */
export const riskFactorDefinition: EvaluationWebDefinition<
  RiskFactorItem,
  RiskFactor,
  RiskFactorFormValues,
  RiskFactorInput
> = {
  type: 'risk_factor',
  href: EVALUATION_TYPE_HREFS.risk_factor,
  typeLabel: (t) => t('types.risk_factor'),
  newLabel: (t) => t('newRiskFactor'),
  rowName: (item) => item.valuer,
  useList() {
    const query = useGetEvaluationsRiskFactors()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsRiskFactorsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsRiskFactorsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsRiskFactorsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsRiskFactors())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsRiskFactorsId())
  },
  useDelete() {
    return useDeleteEvaluationsRiskFactorsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsRiskFactorsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsRiskFactorsIdQueryKey(id),
  form: {
    Component: RiskFactorForm,
    makeSchema: makeRiskFactorSchema,
    defaultValues: riskFactorFormDefaultValues,
    toFormValues: toRiskFactorFormValues,
    toInput: toRiskFactorInput,
  },
  pdf: riskFactorPdfAdapter,
  fileBaseName: 'identificacao-de-riscos',
}
