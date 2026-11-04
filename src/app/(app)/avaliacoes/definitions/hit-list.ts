'use client'

import {
  getEvaluationsHitListsId,
  getGetEvaluationsHitListsIdQueryKey,
  getGetEvaluationsHitListsQueryKey,
  type HitList,
  type HitListInput,
  type HitListItem,
  useDeleteEvaluationsHitListsId,
  useGetEvaluationsHitLists,
  useGetEvaluationsHitListsActivities,
  useGetEvaluationsHitListsId,
  usePostEvaluationsHitLists,
  usePutEvaluationsHitListsId,
} from '@/http/api'
import { EVALUATION_TYPE_HREFS } from '@/lib/evaluation-types'

import { HitListForm } from '../_form/HitListForm'
import {
  type HitListFormData,
  hitListFormDefaultValues,
  makeHitListSchema,
  toHitListFormValues,
  toHitListInput,
} from '../_form/schema'
import { hitListPdfAdapter } from './hit-list-pdf-adapter'
import {
  type EvaluationWebDefinition,
  toEvaluationCreateMutation,
  toEvaluationListState,
  toEvaluationQueryState,
  toEvaluationUpdateMutation,
} from './types'

/** The Hit List has no name of its own: its rows show the translated type. */
export const hitListDefinition: EvaluationWebDefinition<
  HitListItem,
  HitList,
  HitListFormData,
  HitListInput
> = {
  type: 'hit_list',
  href: EVALUATION_TYPE_HREFS.hit_list,
  typeLabel: (t) => t('types.hit_list'),
  newLabel: (t) => t('newHitList'),
  rowName: (_item, typeLabel) => typeLabel,
  useList() {
    const query = useGetEvaluationsHitLists()
    return toEvaluationListState(
      query.data?.status === 200 ? query.data.data : undefined,
      query
    )
  },
  getDetail: (id) => getEvaluationsHitListsId(id),
  useDetail(id, enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsHitListsId(id, { query: { enabled } })
    )
  },
  useActivities(enabled) {
    return toEvaluationQueryState(
      useGetEvaluationsHitListsActivities({ query: { enabled } })
    )
  },
  useCreate() {
    return toEvaluationCreateMutation(usePostEvaluationsHitLists())
  },
  useUpdate() {
    return toEvaluationUpdateMutation(usePutEvaluationsHitListsId())
  },
  useDelete() {
    return useDeleteEvaluationsHitListsId().mutateAsync
  },
  listQueryKey: () => getGetEvaluationsHitListsQueryKey(),
  detailQueryKey: (id) => getGetEvaluationsHitListsIdQueryKey(id),
  form: {
    Component: HitListForm,
    makeSchema: makeHitListSchema,
    defaultValues: hitListFormDefaultValues,
    toFormValues: toHitListFormValues,
    toInput: toHitListInput,
  },
  pdf: hitListPdfAdapter,
  fileBaseName: 'hit-list',
}
