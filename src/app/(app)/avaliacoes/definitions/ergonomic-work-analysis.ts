'use client'

import {
  type ErgonomicWorkAnalysis,
  type ErgonomicWorkAnalysisInput,
  type ErgonomicWorkAnalysisItem,
  getEvaluationsErgonomicWorkAnalysesId,
  getEvaluationsErgonomicWorkAnalysesIdPhoto,
  getGetEvaluationsErgonomicWorkAnalysesIdQueryKey,
  getGetEvaluationsErgonomicWorkAnalysesQueryKey,
  useDeleteEvaluationsErgonomicWorkAnalysesId,
  useDeleteEvaluationsErgonomicWorkAnalysesIdPhoto,
  useGetEvaluationsErgonomicWorkAnalyses,
  useGetEvaluationsErgonomicWorkAnalysesActivities,
  useGetEvaluationsErgonomicWorkAnalysesId,
  usePostEvaluationsErgonomicWorkAnalyses,
  usePutEvaluationsErgonomicWorkAnalysesId,
  usePutEvaluationsErgonomicWorkAnalysesIdPhoto,
} from '@/http/api'
import { FetchError } from '@/http/fetch-client'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ErgonomicWorkAnalysisForm } from '../_form/ErgonomicWorkAnalysisForm'
import {
  type ErgonomicWorkAnalysisFormData,
  ergonomicWorkAnalysisFormDefaultValues,
  makeErgonomicWorkAnalysisSchema,
  toErgonomicWorkAnalysisFormValues,
  toErgonomicWorkAnalysisInput,
} from '../_form/schema'
import { ergonomicWorkAnalysisPdfAdapter } from './ergonomic-work-analysis-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * Fetches the workstation photo of an AETA as a `Blob` through the generated
 * `GET …/{id}/photo`, or `null` when the record has none. The view's
 * thumbnail, "Baixar foto" and the PDF read it on demand (NFR-007).
 */
async function fetchErgonomicWorkAnalysisPhoto(
  record: ErgonomicWorkAnalysis,
  signal?: AbortSignal
) {
  if (!record.photo) return null

  const response = await getEvaluationsErgonomicWorkAnalysesIdPhoto(record.id, {
    signal,
  })

  if (response.status !== 200) {
    throw new FetchError(response.status, response.data, response.data.message)
  }

  return response.data
}

/**
 * The Análise Ergonômica do Trabalho – Escritório (AETA) has no name nor
 * valuer of its own: like the AETP, its rows show the translated type (H-5).
 * Its workstation photo goes after the data through `PUT …/photo`, as the
 * AETP's (FR-013).
 */
export const ergonomicWorkAnalysisDefinition: EvaluationWebDefinition<
  ErgonomicWorkAnalysisItem,
  ErgonomicWorkAnalysis,
  ErgonomicWorkAnalysisFormData,
  ErgonomicWorkAnalysisInput
> = {
  type: 'ergonomic_work_analysis',
  href: EVALUATION_TYPE_HREFS.ergonomic_work_analysis,
  typeLabel: (t) => t('types.ergonomic_work_analysis'),
  newLabel: (t) => t('newErgonomicWorkAnalysis'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsErgonomicWorkAnalyses()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsErgonomicWorkAnalysesId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicWorkAnalysesId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsErgonomicWorkAnalysesActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsErgonomicWorkAnalyses())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(
      usePutEvaluationsErgonomicWorkAnalysesId()
    )
  },
  useDelete() {
    return useDeleteEvaluationsErgonomicWorkAnalysesId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsErgonomicWorkAnalysesQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsErgonomicWorkAnalysesIdQueryKey(id),
  form: {
    Component: ErgonomicWorkAnalysisForm,
    makeSchema: makeErgonomicWorkAnalysisSchema,
    defaultValues: ergonomicWorkAnalysisFormDefaultValues,
    toFormValues: toErgonomicWorkAnalysisFormValues,
    toInput: toErgonomicWorkAnalysisInput,
  },
  pdf: ergonomicWorkAnalysisPdfAdapter,
  fileBaseName: 'analise-ergonomica-do-trabalho-escritorio',
  photo: {
    fetch: fetchErgonomicWorkAnalysisPhoto,
    useUpload() {
      const mutation = usePutEvaluationsErgonomicWorkAnalysesIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        upload: (id, photo) => mutation.mutateAsync({ id, data: { photo } }),
      }
    },
    useRemove() {
      const mutation = useDeleteEvaluationsErgonomicWorkAnalysesIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        remove: (id) => mutation.mutateAsync({ id }),
      }
    },
  },
}
