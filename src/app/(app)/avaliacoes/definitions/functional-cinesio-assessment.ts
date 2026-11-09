'use client'

import {
  type FunctionalCinesioAssessment,
  type FunctionalCinesioAssessmentInput,
  type FunctionalCinesioAssessmentItem,
  getEvaluationsFunctionalCinesioAssessmentsId,
  getGetEvaluationsFunctionalCinesioAssessmentsIdQueryKey,
  getGetEvaluationsFunctionalCinesioAssessmentsQueryKey,
  useDeleteEvaluationsFunctionalCinesioAssessmentsId,
  useGetEvaluationsFunctionalCinesioAssessments,
  useGetEvaluationsFunctionalCinesioAssessmentsActivities,
  useGetEvaluationsFunctionalCinesioAssessmentsId,
  usePostEvaluationsFunctionalCinesioAssessments,
  usePutEvaluationsFunctionalCinesioAssessmentsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { FunctionalCinesioAssessmentForm } from '../_form/FunctionalCinesioAssessmentForm'
import {
  type FunctionalCinesioAssessmentFormData,
  functionalCinesioAssessmentFormDefaultValues,
  makeFunctionalCinesioAssessmentSchema,
  toFunctionalCinesioAssessmentFormValues,
  toFunctionalCinesioAssessmentInput,
} from '../_form/schema'
import { FUNCTIONAL_CINESIO_ASSESSMENT_FILE_BASE_NAME } from '../components/functional-cinesio-assessment-fields'
import { functionalCinesioAssessmentPdfAdapter } from './functional-cinesio-assessment-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Avaliação Cinesiofuncional (ACF) holds health data of an identified person:
 * its rows show the translated type (D-5), which keeps the name out of the listing
 * and of its search, and its file never has the name. It has no photo. Only who
 * may edit reads a record (`restrictedRead`): a Viewer gets the listing and the
 * blank PDF.
 */
export const functionalCinesioAssessmentDefinition: EvaluationWebDefinition<
  FunctionalCinesioAssessmentItem,
  FunctionalCinesioAssessment,
  FunctionalCinesioAssessmentFormData,
  FunctionalCinesioAssessmentInput
> = {
  type: 'functional_cinesio_assessment',
  href: EVALUATION_TYPE_HREFS.functional_cinesio_assessment,
  typeLabel: (t) => t('types.functional_cinesio_assessment'),
  newLabel: (t) => t('newFunctionalCinesioAssessment'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsFunctionalCinesioAssessments()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsFunctionalCinesioAssessmentsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsFunctionalCinesioAssessmentsId(id, {
        query: { enabled },
      })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsFunctionalCinesioAssessmentsActivities({
        query: { enabled },
      })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(
      usePostEvaluationsFunctionalCinesioAssessments()
    )
  },
  useUpdate() {
    return toEvaluationUpdateMutation(
      usePutEvaluationsFunctionalCinesioAssessmentsId()
    )
  },
  useDelete() {
    return useDeleteEvaluationsFunctionalCinesioAssessmentsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsFunctionalCinesioAssessmentsQueryKey(),
  detailQueryKey: (id) =>
    getGetEvaluationsFunctionalCinesioAssessmentsIdQueryKey(id),
  form: {
    Component: FunctionalCinesioAssessmentForm,
    makeSchema: makeFunctionalCinesioAssessmentSchema,
    defaultValues: functionalCinesioAssessmentFormDefaultValues,
    toFormValues: toFunctionalCinesioAssessmentFormValues,
    toInput: toFunctionalCinesioAssessmentInput,
  },
  pdf: functionalCinesioAssessmentPdfAdapter,
  fileBaseName: FUNCTIONAL_CINESIO_ASSESSMENT_FILE_BASE_NAME,
  restrictedRead: true,
}
