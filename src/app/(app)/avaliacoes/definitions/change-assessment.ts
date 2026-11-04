'use client'

import {
  type ChangeAssessment,
  type ChangeAssessmentInput,
  type ChangeAssessmentItem,
  getEvaluationsChangeAssessmentsId,
  getGetEvaluationsChangeAssessmentsIdQueryKey,
  getGetEvaluationsChangeAssessmentsQueryKey,
  useDeleteEvaluationsChangeAssessmentsId,
  useGetEvaluationsChangeAssessments,
  useGetEvaluationsChangeAssessmentsActivities,
  useGetEvaluationsChangeAssessmentsId,
  usePostEvaluationsChangeAssessments,
  usePutEvaluationsChangeAssessmentsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ChangeAssessmentForm } from '../_form/ChangeAssessmentForm'
import {
  type ChangeAssessmentFormData,
  changeAssessmentFormDefaultValues,
  makeChangeAssessmentSchema,
  toChangeAssessmentFormValues,
  toChangeAssessmentInput,
} from '../_form/schema'
import { changeAssessmentPdfAdapter } from './change-assessment-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Avaliação de Mudanças / Projetos has no name of its own: like the Hit
 * List, its rows show the translated type (FR-014).
 */
export const changeAssessmentDefinition: EvaluationWebDefinition<
  ChangeAssessmentItem,
  ChangeAssessment,
  ChangeAssessmentFormData,
  ChangeAssessmentInput
> = {
  type: 'change_assessment',
  href: EVALUATION_TYPE_HREFS.change_assessment,
  typeLabel: (t) => t('types.change_assessment'),
  newLabel: (t) => t('newChangeAssessment'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsChangeAssessments()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsChangeAssessmentsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsChangeAssessmentsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsChangeAssessmentsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsChangeAssessments())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsChangeAssessmentsId())
  },
  useDelete() {
    return useDeleteEvaluationsChangeAssessmentsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsChangeAssessmentsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsChangeAssessmentsIdQueryKey(id),
  form: {
    Component: ChangeAssessmentForm,
    makeSchema: makeChangeAssessmentSchema,
    defaultValues: changeAssessmentFormDefaultValues,
    toFormValues: toChangeAssessmentFormValues,
    toInput: toChangeAssessmentInput,
  },
  pdf: changeAssessmentPdfAdapter,
  fileBaseName: 'avaliacao-de-mudancas',
}
