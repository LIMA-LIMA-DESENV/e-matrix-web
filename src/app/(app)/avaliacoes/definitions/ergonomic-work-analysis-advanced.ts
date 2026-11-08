'use client'

import {
  type ErgonomicWorkAnalysisAdvanced,
  type ErgonomicWorkAnalysisAdvancedInput,
  type ErgonomicWorkAnalysisAdvancedItem,
  getEvaluationsErgonomicWorkAnalysesAdvancedId,
  getGetEvaluationsErgonomicWorkAnalysesAdvancedIdQueryKey,
  getGetEvaluationsErgonomicWorkAnalysesAdvancedQueryKey,
  useDeleteEvaluationsErgonomicWorkAnalysesAdvancedId,
  useDeleteEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto,
  useGetEvaluationsErgonomicWorkAnalysesAdvanced,
  useGetEvaluationsErgonomicWorkAnalysesAdvancedActivities,
  useGetEvaluationsErgonomicWorkAnalysesAdvancedId,
  usePostEvaluationsErgonomicWorkAnalysesAdvanced,
  usePutEvaluationsErgonomicWorkAnalysesAdvancedId,
  usePutEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto,
} from '@/http/api'
import { fetchEvaluationPhoto } from '@/lib/download-file'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ErgonomicWorkAnalysisAdvancedForm } from '../_form/ErgonomicWorkAnalysisAdvancedForm'
import {
  type ErgonomicWorkAnalysisAdvancedFormData,
  ergonomicWorkAnalysisAdvancedFormDefaultValues,
  makeErgonomicWorkAnalysisAdvancedSchema,
  toErgonomicWorkAnalysisAdvancedFormValues,
  toErgonomicWorkAnalysisAdvancedInput,
} from '../_form/schema'
import { ergonomicWorkAnalysisAdvancedPdfAdapter } from './ergonomic-work-analysis-advanced-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * The Análise Ergonômica do Trabalho – Produção (AETP) has no name nor valuer
 * of its own: like the Hit List and the AMP, its rows show the translated
 * type (FR-021, H-5). It is the first type with a photo, the sector image,
 * sent after the data through `PUT …/photo` (FR-020, D-2).
 */
export const ergonomicWorkAnalysisAdvancedDefinition: EvaluationWebDefinition<
  ErgonomicWorkAnalysisAdvancedItem,
  ErgonomicWorkAnalysisAdvanced,
  ErgonomicWorkAnalysisAdvancedFormData,
  ErgonomicWorkAnalysisAdvancedInput
> = {
  type: 'ergonomic_work_analysis_advanced',
  href: EVALUATION_TYPE_HREFS.ergonomic_work_analysis_advanced,
  typeLabel: (t) => t('types.ergonomic_work_analysis_advanced'),
  newLabel: (t) => t('newErgonomicWorkAnalysisAdvanced'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsErgonomicWorkAnalysesAdvanced()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsErgonomicWorkAnalysesAdvancedId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicWorkAnalysesAdvancedId(id, {
        query: { enabled },
      })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicWorkAnalysesAdvancedActivities({
        query: { enabled },
      })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(
      usePostEvaluationsErgonomicWorkAnalysesAdvanced()
    )
  },
  useUpdate() {
    return toEvaluationUpdateMutation(
      usePutEvaluationsErgonomicWorkAnalysesAdvancedId()
    )
  },
  useDelete() {
    return useDeleteEvaluationsErgonomicWorkAnalysesAdvancedId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsErgonomicWorkAnalysesAdvancedQueryKey(),
  detailQueryKey: (id) =>
    getGetEvaluationsErgonomicWorkAnalysesAdvancedIdQueryKey(id),
  form: {
    Component: ErgonomicWorkAnalysisAdvancedForm,
    makeSchema: makeErgonomicWorkAnalysisAdvancedSchema,
    defaultValues: ergonomicWorkAnalysisAdvancedFormDefaultValues,
    toFormValues: toErgonomicWorkAnalysisAdvancedFormValues,
    toInput: toErgonomicWorkAnalysisAdvancedInput,
  },
  pdf: ergonomicWorkAnalysisAdvancedPdfAdapter,
  fileBaseName: 'analise-ergonomica-do-trabalho-producao',
  photo: {
    fetch: fetchEvaluationPhoto,
    useUpload() {
      const mutation = usePutEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        upload: (id, photo) => mutation.mutateAsync({ id, data: { photo } }),
      }
    },
    useRemove() {
      const mutation =
        useDeleteEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        remove: (id) => mutation.mutateAsync({ id }),
      }
    },
  },
}
