import type { QueryKey } from '@tanstack/react-query'
import type { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import type { z } from 'zod'

import type { ImprovementProjectActivity } from '@/http/api'
import type { EvaluationType } from '@/lib/evaluation-types'

import type { Translate } from '../_form/schema'
import type { EvaluationActivityOptionsState } from '../_form/use-evaluation-activity-options'

/** `t` of the `evaluations` namespace, as the definitions read their texts. */
export type EvaluationsTranslator = ReturnType<
  typeof useTranslations<'evaluations'>
>

/** What every type's listing item has, whatever its own fields (FR-003). */
export interface EvaluationListItem {
  id: string
  number: number
  code: string
  activity: ImprovementProjectActivity
  created_at: string
  updated_at: string
}

/**
 * What every type's detail has: the code names the PDF file and titles the
 * view and the edit, and the activity is the only option of the view's
 * select.
 */
export interface EvaluationDetail {
  id: string
  code: string
  activity: ImprovementProjectActivity
}

/** The listing query of a type, through a common signature (RK-2). */
export interface EvaluationListState<TItem> {
  /** `undefined` while loading and after an error. */
  items: TItem[] | undefined
  isError: boolean
  refetch: () => void
}

/**
 * A read answer of a type: the generated client's union, of which only the
 * 200 carries the data.
 */
export type EvaluationResponse<TData> =
  | { status: 200; data: TData }
  | { status: 400 | 401 | 403 | 404 | 409 | 500; data: unknown }

/** The detail answer of a type. */
export type EvaluationDetailResponse<TDetail> = EvaluationResponse<TDetail>

/** A generated read query (the detail, the activities) of a type (RK-2). */
export interface EvaluationQueryState<TData> {
  /** The data of a 200; `undefined` while loading, after an error or else. */
  data: TData | undefined
  isLoading: boolean
  /** The request failed, or the API answered anything but a 200. */
  isError: boolean
  /** What a failed load is explained from: the error, or the answer itself. */
  failure: unknown
  refetch: () => void
}

/** The state of a generated write (hook) the form shows. */
export interface EvaluationMutationState {
  isPending: boolean
  isError: boolean
  error: unknown
}

/** The generated `POST` of a type (hook). */
export interface EvaluationCreateMutation<TInput>
  extends EvaluationMutationState {
  /**
   * Resolves with the code the API assigned (`null` for an answer without
   * the record) and rejects when the request fails.
   */
  create(input: TInput): Promise<string | null>
}

/** The generated `PUT` of a type (hook); rejects when the request fails. */
export interface EvaluationUpdateMutation<TInput>
  extends EvaluationMutationState {
  update(id: string, input: TInput): Promise<unknown>
}

/**
 * What the generic create, view and edit pages pass to the form of a type.
 * Every type's form takes these, typed with its own form data.
 */
export interface EvaluationFormProps<TFormData> {
  /** The record's code, the title of the edit and the view; absent to create. */
  code?: string
  initialValues?: TFormData
  /** The view (J2): every control disabled, for real, and no "Salvar". */
  readOnly?: boolean
  activities: EvaluationActivityOptionsState
  /** The tab, with the search, sort and page the user came from. */
  listHref: string
  /** Buttons of the header, beside "Voltar" (the view's PDF and "Alterar"). */
  headerActions?: ReactNode
  isSubmitting?: boolean
  errorMessage?: string | null
  /** Sends the form; resolves `true` once saved (`useGuardedSubmit`). */
  onSubmit?(data: TFormData): Promise<boolean>
}

/**
 * The form of a type (D-6): its own layout, over `form-parts.tsx`, and the
 * functions of `_form/schema.ts` that mirror the API rules and convert
 * between the stored record, the form data and the request body.
 */
export interface EvaluationFormDefinition<TDetail, TFormData, TInput> {
  /** The create, edit and view form, which builds its schema and defaults. */
  Component(props: EvaluationFormProps<TFormData>): ReactNode
  makeSchema(tv: Translate): z.ZodType<TFormData>
  defaultValues(): TFormData
  /** A stored record as the form holds it (the view and the edit). */
  toFormValues(detail: TDetail): TFormData
  /** The body of the `POST` and the `PUT`. */
  toInput(data: TFormData): TInput
}

/**
 * Turns the detail of a type, or `null` for the blank form, into its PDF.
 * `usePdfBuilder` is a hook, called on every render of the screen: it reads
 * the translations and formatters the report needs. The function it returns
 * loads the report module of `src/lib/pdf` (and anything else the report
 * needs, such as images) on demand and resolves to the synchronous builder.
 */
export interface EvaluationPdfAdapter<TDetail> {
  usePdfBuilder(): () => Promise<EvaluationPdfBuilder<TDetail>>
}

/** The report of a type, loaded: builds the PDF of a record or the blank. */
export interface EvaluationPdfBuilder<TDetail> {
  build(detail: TDetail | null): Blob
}

/**
 * Everything the web needs of one evaluation type (FR-009). The generic
 * listing, deletion, PDF and create, view and edit pages read only this; a
 * type is added by writing one definition, never by editing them (NFR-005).
 *
 * The functions that take the type's records are methods, so a definition
 * of a concrete item, detail, form data and body is assignable to the
 * common `EvaluationWebDefinition` the generic screens take.
 */
export interface EvaluationWebDefinition<
  TItem extends EvaluationListItem = EvaluationListItem,
  TDetail extends EvaluationDetail = EvaluationDetail,
  TFormData = unknown,
  TInput = unknown,
> {
  type: EvaluationType
  /** The tab, from `EVALUATION_TYPE_HREFS`. */
  href: string
  /** The translated type, as the tab, the type column and the PDF name it. */
  typeLabel(t: EvaluationsTranslator): string
  /** "Nova …", beside the search and on the empty state. */
  newLabel(t: EvaluationsTranslator): string
  /** The name column of a row: the translated type or the record's own. */
  rowName(item: TItem, typeLabel: string): string
  /** The generated listing query (hook). */
  useList(): EvaluationListState<TItem>
  /** The generated detail request, fetched on the click of a PDF. */
  getDetail(id: string): Promise<EvaluationDetailResponse<TDetail>>
  /** The generated detail query (hook) of the view and the edit. */
  useDetail(id: string, enabled: boolean): EvaluationQueryState<TDetail>
  /** The generated `GET /evaluations/<type>/activities` (hook). */
  useActivities(
    enabled: boolean
  ): EvaluationQueryState<ImprovementProjectActivity[]>
  useCreate(): EvaluationCreateMutation<TInput>
  useUpdate(): EvaluationUpdateMutation<TInput>
  /** The generated DELETE (hook), resolved with the id. */
  useDelete(): (variables: { id: string }) => Promise<unknown>
  listQueryKey(): QueryKey
  detailQueryKey(id: string): QueryKey
  form: EvaluationFormDefinition<TDetail, TFormData, TInput>
  pdf: EvaluationPdfAdapter<TDetail>
  /** `<code>-<base>.pdf` for a record and `<base>.pdf` for the blank form. */
  fileBaseName: string
}

/** Adapts a generated read query to `EvaluationQueryState`. */
export function toEvaluationQueryState<TData>(query: {
  data: EvaluationResponse<TData> | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}): EvaluationQueryState<TData> {
  const { data } = query

  return {
    data: data?.status === 200 ? data.data : undefined,
    isLoading: query.isLoading,
    isError: query.isError || (!!data && data.status !== 200),
    failure: query.error ?? data,
    refetch: () => void query.refetch(),
  }
}

/** Adapts a generated `POST` (hook) to `EvaluationCreateMutation`. */
export function toEvaluationCreateMutation<TInput>(mutation: {
  mutateAsync(variables: {
    data: TInput
  }): Promise<
    | { status: 201; data: { code: string } }
    | { status: 400 | 401 | 403 | 404 | 409 | 500; data: unknown }
  >
  isPending: boolean
  isError: boolean
  error: unknown
}): EvaluationCreateMutation<TInput> {
  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    async create(input) {
      const response = await mutation.mutateAsync({ data: input })
      return response.status === 201 ? response.data.code : null
    },
  }
}

/** Adapts a generated `PUT` (hook) to `EvaluationUpdateMutation`. */
export function toEvaluationUpdateMutation<TInput>(mutation: {
  mutateAsync(variables: { id: string; data: TInput }): Promise<unknown>
  isPending: boolean
  isError: boolean
  error: unknown
}): EvaluationUpdateMutation<TInput> {
  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    update: (id, input) => mutation.mutateAsync({ id, data: input }),
  }
}

/** Adapts a generated listing query to `EvaluationListState`. */
export function toEvaluationListState<TItem>(
  items: TItem[] | undefined,
  query: { isError: boolean; refetch: () => unknown }
): EvaluationListState<TItem> {
  return {
    items,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}
