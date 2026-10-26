import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import {
  getGetMatricesPeriodIdQueryKey,
  type getMatricesPeriodIdResponse,
  type MatrixRow,
  type MatrixValues,
  type PutMatricesPeriodIdActivitiesActivityIdFieldsFieldMutationVariables,
  usePutMatricesPeriodIdActivitiesActivityIdFieldsField,
} from '@/http/api'
import { getErrorKey, useTranslateError } from '@/lib/error-translator'

type MatrixFieldSegment =
  PutMatricesPeriodIdActivitiesActivityIdFieldsFieldMutationVariables['field']

/** The URL segment of a field: its JSON key in kebab-case (spec §10). */
function toFieldSegment(key: keyof MatrixValues) {
  return key.replaceAll('_', '-') as MatrixFieldSegment
}

// What the Matrix on screen no longer matches: it is read again, and a
// deleted period falls back to the default (FR-018).
const STALE_MATRIX_ERRORS = new Set([
  'periodNotFound',
  'matrixNotInitialized',
  'matrixActivityNotFound',
])

/**
 * Writes one field of one row of the Matrix of the period (J5). Nothing is
 * optimistic, as in the Management Plan: the cell keeps its value until the
 * API answers, and only then the row the API answers with replaces the one in
 * the cached Matrix, with no new request (FR-024).
 *
 * While two writes of the same row overlap, each answer only brings its own
 * field into the cache. Their answers can arrive in any order, and a whole
 * row from the older write would bring back the previous value of the other
 * field.
 *
 * `saveField` resolves to `null` when saved, or to the translated error.
 */
export function useUpdateMatrixField(periodId: string) {
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  // Writes on their way, per activity, and the rows where two overlapped.
  const pendingRef = useRef(new Map<string, number>())
  const overlappingRef = useRef(new Set<string>())

  const { mutateAsync } =
    usePutMatricesPeriodIdActivitiesActivityIdFieldsField()

  const replaceRow = useCallback(
    (row: MatrixRow, field: keyof MatrixValues, onlyField: boolean) => {
      queryClient.setQueryData<getMatricesPeriodIdResponse>(
        getGetMatricesPeriodIdQueryKey(periodId),
        (current) =>
          current?.status === 200
            ? {
                ...current,
                data: {
                  ...current.data,
                  rows: current.data.rows.map((item) => {
                    if (item.activity.id !== row.activity.id) return item

                    return onlyField
                      ? {
                          ...item,
                          values: {
                            ...item.values,
                            [field]: row.values[field],
                          },
                        }
                      : row
                  }),
                },
              }
            : current
      )
    },
    [periodId, queryClient]
  )

  return useCallback(
    async (
      activityId: string,
      field: keyof MatrixValues,
      value: string | null
    ): Promise<string | null> => {
      const pending = pendingRef.current
      const overlapping = overlappingRef.current
      const count = (pending.get(activityId) ?? 0) + 1

      pending.set(activityId, count)
      if (count > 1) overlapping.add(activityId)

      try {
        const response = await mutateAsync({
          periodId,
          activityId,
          field: toFieldSegment(field),
          data: { value },
        })
        if (response.status === 200) {
          replaceRow(response.data, field, overlapping.has(activityId))
        }
        return null
      } catch (error) {
        if (STALE_MATRIX_ERRORS.has(getErrorKey(error))) {
          void queryClient.invalidateQueries({
            queryKey: getGetMatricesPeriodIdQueryKey(periodId),
          })
        }
        return translateError(error)
      } finally {
        const left = (pending.get(activityId) ?? 1) - 1

        if (left > 0) {
          pending.set(activityId, left)
        } else {
          pending.delete(activityId)
          overlapping.delete(activityId)
        }
      }
    },
    [mutateAsync, periodId, queryClient, replaceRow, translateError]
  )
}
