'use client'

import {
  getEvaluationsIncidentInvestigationsId,
  getEvaluationsIncidentInvestigationsIdPhoto,
  getGetEvaluationsIncidentInvestigationsIdQueryKey,
  getGetEvaluationsIncidentInvestigationsQueryKey,
  type IncidentInvestigation,
  type IncidentInvestigationInput,
  type IncidentInvestigationItem,
  useDeleteEvaluationsIncidentInvestigationsId,
  useDeleteEvaluationsIncidentInvestigationsIdPhoto,
  useGetEvaluationsIncidentInvestigations,
  useGetEvaluationsIncidentInvestigationsActivities,
  useGetEvaluationsIncidentInvestigationsId,
  usePostEvaluationsIncidentInvestigations,
  usePutEvaluationsIncidentInvestigationsId,
  usePutEvaluationsIncidentInvestigationsIdPhoto,
} from '@/http/api'
import { FetchError } from '@/http/fetch-client'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { IncidentInvestigationForm } from '../_form/IncidentInvestigationForm'
import {
  type IncidentInvestigationFormData,
  incidentInvestigationFormDefaultValues,
  makeIncidentInvestigationSchema,
  toIncidentInvestigationFormValues,
  toIncidentInvestigationInput,
} from '../_form/schema'
import { incidentInvestigationPdfAdapter } from './incident-investigation-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/**
 * Fetches the photo of an II as a `Blob` through the generated
 * `GET …/{id}/photo`, or `null` when the record has none. The view's thumbnail,
 * "Baixar foto" and the PDF read it on demand (NFR-007).
 */
async function fetchIncidentInvestigationPhoto(
  record: IncidentInvestigation,
  signal?: AbortSignal
) {
  if (!record.photo) return null

  const response = await getEvaluationsIncidentInvestigationsIdPhoto(
    record.id,
    { signal }
  )

  if (response.status !== 200) {
    throw new FetchError(response.status, response.data, response.data.message)
  }

  return response.data
}

/**
 * The Avaliação de Incidente / Acidente (II) has no name of its own, and its
 * sector is optional: its rows show the translated type (D-4), which keeps the
 * employee and the occurrence out of the listing. Its photo goes after the data
 * through `PUT …/photo`, as the AETA's (FR-013).
 */
export const incidentInvestigationDefinition: EvaluationWebDefinition<
  IncidentInvestigationItem,
  IncidentInvestigation,
  IncidentInvestigationFormData,
  IncidentInvestigationInput
> = {
  type: 'incident_investigation',
  href: EVALUATION_TYPE_HREFS.incident_investigation,
  typeLabel: (t) => t('types.incident_investigation'),
  newLabel: (t) => t('newIncidentInvestigation'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsIncidentInvestigations()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsIncidentInvestigationsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsIncidentInvestigationsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsIncidentInvestigationsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(
      usePostEvaluationsIncidentInvestigations()
    )
  },
  useUpdate() {
    return toEvaluationUpdateMutation(
      usePutEvaluationsIncidentInvestigationsId()
    )
  },
  useDelete() {
    return useDeleteEvaluationsIncidentInvestigationsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsIncidentInvestigationsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsIncidentInvestigationsIdQueryKey(id),
  form: {
    Component: IncidentInvestigationForm,
    makeSchema: makeIncidentInvestigationSchema,
    defaultValues: incidentInvestigationFormDefaultValues,
    toFormValues: toIncidentInvestigationFormValues,
    toInput: toIncidentInvestigationInput,
  },
  pdf: incidentInvestigationPdfAdapter,
  fileBaseName: 'avaliacao-de-incidente-acidente',
  photo: {
    fetch: fetchIncidentInvestigationPhoto,
    useUpload() {
      const mutation = usePutEvaluationsIncidentInvestigationsIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        upload: (id, photo) => mutation.mutateAsync({ id, data: { photo } }),
      }
    },
    useRemove() {
      const mutation = useDeleteEvaluationsIncidentInvestigationsIdPhoto()
      return {
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        remove: (id) => mutation.mutateAsync({ id }),
      }
    },
  },
}
