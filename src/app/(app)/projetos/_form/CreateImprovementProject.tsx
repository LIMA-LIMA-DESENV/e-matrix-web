'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetImprovementProjectsQueryKey,
  type ImprovementProjectScope,
  type Period,
  useGetPeriods,
  usePostImprovementProjects,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { SCOPE_TYPES } from '../components'
import {
  ImprovementProjectForm,
  type ImprovementProjectFormFiles,
} from './ImprovementProjectForm'
import {
  PROJECT_TAB_PATHS,
  projectsListHref,
  projectsListHrefAfterSave,
} from './list-href'
import { ProjectFormSkeleton } from './ProjectFormSkeleton'
import type { ImprovementProjectFormData } from './schema'
import { useActivityOptions } from './use-activity-options'

interface CreateImprovementProjectPageProps {
  /** RGP on `/projetos/rgp/novo`, RGA on `/projetos/rga/novo` (D-13). */
  scope: ImprovementProjectScope
}

export function CreateImprovementProjectPage({
  scope,
}: CreateImprovementProjectPageProps) {
  return (
    <Suspense fallback={<ProjectFormSkeleton />}>
      <CreateImprovementProject scope={scope} />
    </Suspense>
  )
}

/**
 * Creates an RGP or an RGA (J8). Saved, it goes back to the tab of the type,
 * in the period of the saved date, with a message citing the code the API
 * assigned.
 */
function CreateImprovementProject({
  scope,
}: CreateImprovementProjectPageProps) {
  const t = useTranslations('projects.form')
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listPath = PROJECT_TAB_PATHS[scope]

  // A Viewer reaching this URL directly goes back to the tab (FR-040). The
  // real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(listPath)
    }
  }, [canEdit, listPath, router])

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

  const activities = useActivityOptions(canEdit)

  const { mutateAsync, isPending, isError, error } =
    usePostImprovementProjects()

  async function handleSubmit(
    data: ImprovementProjectFormData,
    files: ImprovementProjectFormFiles
  ) {
    let createdCode: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          scope,
          activity_id: data.activity_id,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          concern: data.concern,
          improvement_recommendation: data.improvement_recommendation,
          priority: data.priority,
          // A photo not picked stays undefined, which leaves its part out of
          // the multipart body entirely: "no photo" to the API (FR-007).
          before_photo: files.before_photo,
          after_photo: files.after_photo,
        },
      })
      if (response.status === 201) createdCode = response.data.code
    } catch {
      // Shown from the mutation state, translated — including a period or
      // an activity deleted after this screen loaded, which only the API
      // can see.
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetImprovementProjectsQueryKey(),
    })
    router.push(
      createdCode
        ? projectsListHrefAfterSave(
            listPath,
            searchParams,
            periods,
            { date: data.date, type: SCOPE_TYPES[scope] },
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
    <ImprovementProjectForm
      mode="create"
      scope={scope}
      periods={periods}
      activities={activities}
      listHref={projectsListHref(listPath, searchParams)}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
