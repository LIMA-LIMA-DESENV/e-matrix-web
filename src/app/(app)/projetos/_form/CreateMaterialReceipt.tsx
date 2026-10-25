'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetMaterialReceiptsQueryKey,
  type Period,
  useGetPeriods,
  usePostMaterialReceipts,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import {
  PROJECT_TAB_PATHS,
  projectsListHref,
  projectsListHrefAfterSave,
} from './list-href'
import { MaterialReceiptForm } from './MaterialReceiptForm'
import { ProjectFormSkeleton } from './ProjectFormSkeleton'
import type { MaterialReceiptFormData } from './schema'

const listPath = PROJECT_TAB_PATHS.office

export function CreateMaterialReceiptPage() {
  return (
    <Suspense fallback={<ProjectFormSkeleton />}>
      <CreateMaterialReceipt />
    </Suspense>
  )
}

/**
 * Creates an RA (J9). Saved, it goes back to the Escritório tab, in the
 * period of the saved date, with a message citing the code the API assigned.
 */
function CreateMaterialReceipt() {
  const t = useTranslations('projects.form')
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()

  // A Viewer reaching this URL directly goes back to the tab (FR-040). The
  // real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(listPath)
    }
  }, [canEdit, router])

  // The date is checked against these, so the form waits for them.
  const {
    data: periodsResponse,
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    refetch: refetchPeriods,
  } = useGetPeriods({ query: { enabled: canEdit } })

  const periods = useMemo<Period[]>(
    () => (periodsResponse?.status === 200 ? periodsResponse.data : []),
    [periodsResponse]
  )

  const { mutateAsync, isPending, isError, error } = usePostMaterialReceipts()

  async function handleSubmit(data: MaterialReceiptFormData, file?: File) {
    let createdCode: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          employee: data.employee,
          employee_registry: data.employee_registry,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          // Undefined leaves the part out of the body: "no form" (FR-020).
          file,
        },
      })
      if (response.status === 201) createdCode = response.data.code
    } catch {
      // Shown from the mutation state, translated — including a period
      // deleted after this screen loaded, which only the API can see.
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetMaterialReceiptsQueryKey(),
    })
    router.push(
      createdCode
        ? projectsListHrefAfterSave(
            listPath,
            searchParams,
            periods,
            { date: data.date, type: 'ra' },
            { param: 'created', code: createdCode }
          )
        : projectsListHref(listPath, searchParams)
    )
    return true
  }

  if (!canEdit) {
    return null
  }

  if (isPeriodsLoading) {
    return <ProjectFormSkeleton />
  }

  if (isPeriodsError || periodsResponse?.status !== 200) {
    return (
      <ListErrorState
        title={t('loadErrorPeriods')}
        onRetry={() => void refetchPeriods()}
      />
    )
  }

  return (
    <MaterialReceiptForm
      mode="create"
      periods={periods}
      listHref={projectsListHref(listPath, searchParams)}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
