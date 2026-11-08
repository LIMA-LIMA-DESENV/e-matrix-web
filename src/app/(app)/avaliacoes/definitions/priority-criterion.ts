'use client'

import {
  getEvaluationsPriorityCriteriaId,
  getGetEvaluationsPriorityCriteriaIdQueryKey,
  getGetEvaluationsPriorityCriteriaQueryKey,
  type PriorityCriterion,
  type PriorityCriterionInput,
  type PriorityCriterionItem,
  useDeleteEvaluationsPriorityCriteriaId,
  useGetEvaluationsPriorityCriteria,
  useGetEvaluationsPriorityCriteriaActivities,
  useGetEvaluationsPriorityCriteriaId,
  usePostEvaluationsPriorityCriteria,
  usePutEvaluationsPriorityCriteriaId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { PriorityCriterionForm } from '../_form/PriorityCriterionForm'
import {
  makePriorityCriterionSchema,
  type PriorityCriterionFormData,
  priorityCriterionFormDefaultValues,
  toPriorityCriterionFormValues,
  toPriorityCriterionInput,
} from '../_form/schema'
import { priorityCriterionPdfAdapter } from './priority-criterion-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Critério de Prioridade (CP) has no name of its own, but a required
 * sector: its rows show the sector, which tells the records apart better
 * than the repeated type, as on the CDIP (D-7, H-3).
 */
export const priorityCriterionDefinition: EvaluationWebDefinition<
  PriorityCriterionItem,
  PriorityCriterion,
  PriorityCriterionFormData,
  PriorityCriterionInput
> = {
  type: 'priority_criterion',
  href: EVALUATION_TYPE_HREFS.priority_criterion,
  typeLabel: (t) => t('types.priority_criterion'),
  newLabel: (t) => t('newPriorityCriterion'),
  rowName: (item) => item.sector,
  useList() {
    const query = useGetEvaluationsPriorityCriteria()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsPriorityCriteriaId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsPriorityCriteriaId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsPriorityCriteriaActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsPriorityCriteria())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsPriorityCriteriaId())
  },
  useDelete() {
    return useDeleteEvaluationsPriorityCriteriaId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsPriorityCriteriaQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsPriorityCriteriaIdQueryKey(id),
  form: {
    Component: PriorityCriterionForm,
    makeSchema: makePriorityCriterionSchema,
    defaultValues: priorityCriterionFormDefaultValues,
    toFormValues: toPriorityCriterionFormValues,
    toInput: toPriorityCriterionInput,
  },
  pdf: priorityCriterionPdfAdapter,
  fileBaseName: 'criterio-de-prioridade',
}
