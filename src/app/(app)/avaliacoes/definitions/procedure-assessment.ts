'use client'

import {
  getEvaluationsProcedureAssessmentsId,
  getGetEvaluationsProcedureAssessmentsIdQueryKey,
  getGetEvaluationsProcedureAssessmentsQueryKey,
  type ProcedureAssessment,
  type ProcedureAssessmentInput,
  type ProcedureAssessmentItem,
  useDeleteEvaluationsProcedureAssessmentsId,
  useGetEvaluationsProcedureAssessments,
  useGetEvaluationsProcedureAssessmentsActivities,
  useGetEvaluationsProcedureAssessmentsId,
  usePostEvaluationsProcedureAssessments,
  usePutEvaluationsProcedureAssessmentsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ProcedureAssessmentForm } from '../_form/ProcedureAssessmentForm'
import {
  makeProcedureAssessmentSchema,
  type ProcedureAssessmentFormData,
  procedureAssessmentFormDefaultValues,
  toProcedureAssessmentFormValues,
  toProcedureAssessmentInput,
} from '../_form/schema'
import { procedureAssessmentPdfAdapter } from './procedure-assessment-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Avaliação de Risco Ergonômico de Tarefas (AP) has no name of its own,
 * but a required sector: its rows show the sector, which tells the records
 * apart better than the repeated type, as on the CDIP and the CP (D-5, H-2).
 */
export const procedureAssessmentDefinition: EvaluationWebDefinition<
  ProcedureAssessmentItem,
  ProcedureAssessment,
  ProcedureAssessmentFormData,
  ProcedureAssessmentInput
> = {
  type: 'procedure_assessment',
  href: EVALUATION_TYPE_HREFS.procedure_assessment,
  typeLabel: (t) => t('types.procedure_assessment'),
  newLabel: (t) => t('newProcedureAssessment'),
  rowName: (item) => item.sector,
  useList() {
    const query = useGetEvaluationsProcedureAssessments()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsProcedureAssessmentsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsProcedureAssessmentsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsProcedureAssessmentsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsProcedureAssessments())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsProcedureAssessmentsId())
  },
  useDelete() {
    return useDeleteEvaluationsProcedureAssessmentsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsProcedureAssessmentsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsProcedureAssessmentsIdQueryKey(id),
  form: {
    Component: ProcedureAssessmentForm,
    makeSchema: makeProcedureAssessmentSchema,
    defaultValues: procedureAssessmentFormDefaultValues,
    toFormValues: toProcedureAssessmentFormValues,
    toInput: toProcedureAssessmentInput,
  },
  pdf: procedureAssessmentPdfAdapter,
  fileBaseName: 'avaliacao-de-risco-ergonomico-de-tarefas',
}
