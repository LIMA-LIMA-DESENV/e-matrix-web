'use client'

import {
  type Checklist,
  type ChecklistInput,
  type ChecklistItem,
  getEvaluationsChecklistsId,
  getGetEvaluationsChecklistsIdQueryKey,
  getGetEvaluationsChecklistsQueryKey,
  useDeleteEvaluationsChecklistsId,
  useGetEvaluationsChecklists,
  useGetEvaluationsChecklistsActivities,
  useGetEvaluationsChecklistsId,
  usePostEvaluationsChecklists,
  usePutEvaluationsChecklistsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { ChecklistForm } from '../_form/ChecklistForm'
import {
  type ChecklistFormData,
  checklistFormDefaultValues,
  makeChecklistSchema,
  toChecklistFormValues,
  toChecklistInput,
} from '../_form/schema'
import { checklistPdfAdapter } from './checklist-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/** The Coleta de Dados In Loco: its rows show the record's own `name`. */
export const checklistDefinition: EvaluationWebDefinition<
  ChecklistItem,
  Checklist,
  ChecklistFormData,
  ChecklistInput
> = {
  type: 'checklist',
  href: EVALUATION_TYPE_HREFS.checklist,
  typeLabel: (t) => t('types.checklist'),
  newLabel: (t) => t('newChecklist'),
  rowName: (item) => item.name,
  useList() {
    const query = useGetEvaluationsChecklists()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsChecklistsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsChecklistsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsChecklistsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsChecklists())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsChecklistsId())
  },
  useDelete() {
    return useDeleteEvaluationsChecklistsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsChecklistsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsChecklistsIdQueryKey(id),
  form: {
    Component: ChecklistForm,
    makeSchema: makeChecklistSchema,
    defaultValues: checklistFormDefaultValues,
    toFormValues: toChecklistFormValues,
    toInput: toChecklistInput,
  },
  pdf: checklistPdfAdapter,
  fileBaseName: 'coleta-de-dados',
}
