'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetImprovementProjectsIdQueryKey,
  getGetImprovementProjectsQueryKey,
  type getImprovementProjectsIdResponse,
  type ImprovementProjectScope,
  type Period,
  useDeleteImprovementProjectsIdFilesAttachment,
  useGetImprovementProjectsId,
  useGetPeriods,
  usePutImprovementProjectsId,
} from '@/http/api'
import {
  downloadImprovementProjectPhoto,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import { SCOPE_TYPES } from '../components'
import {
  ImprovementProjectForm,
  type ImprovementProjectFormFiles,
} from './ImprovementProjectForm'
import {
  improvementProjectFormPath,
  PHOTO_REMOVED_PARAMS,
  PROJECT_TAB_PATHS,
  projectFormHref,
  projectsListHref,
  projectsListHrefAfterSave,
  projectsListHrefWithFeedback,
} from './list-href'
import { ProjectFormSkeleton } from './ProjectFormSkeleton'
import { RemoveProjectFileModal } from './RemoveProjectFileModal'
import type { ImprovementProjectFormData } from './schema'
import { useActivityOptions } from './use-activity-options'

interface EditImprovementProjectPageProps {
  /** The type of the route: `/projetos/rgp/…` or `/projetos/rga/…` (D-13). */
  scope: ImprovementProjectScope
}

export function EditImprovementProjectPage({
  scope,
}: EditImprovementProjectPageProps) {
  return (
    <Suspense fallback={<ProjectFormSkeleton />}>
      <EditImprovementProject scope={scope} />
    </Suspense>
  )
}

/**
 * Edits an RGP or an RGA (J10), titled with its code. Each stored photo shows
 * its name with download and remove (J11); a blank photo field keeps it. A
 * record opened under the other type's route is sent to its own route
 * (FR-035), since the scope never changes. The deletion is on the listing
 * only (D-15).
 */
function EditImprovementProject({ scope }: EditImprovementProjectPageProps) {
  const t = useTranslations('projects')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: projectId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [removingPhoto, setRemovingPhoto] =
    useState<ImprovementProjectPhotoKey | null>(null)
  const [downloadingPhoto, setDownloadingPhoto] =
    useState<ImprovementProjectPhotoKey | null>(null)
  const [downloadError, setDownloadError] = useState<unknown>(null)
  const listPath = PROJECT_TAB_PATHS[scope]

  // A Viewer reaching this URL directly goes back to the tab (FR-040),
  // before any write request is even possible. The real guard is the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(listPath)
    }
  }, [canEdit, listPath, router])

  const {
    data: projectResponse,
    isLoading: isProjectLoading,
    isError: isProjectError,
    refetch: refetchProject,
  } = useGetImprovementProjectsId(projectId, {
    query: { enabled: canEdit && !!projectId },
  })

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

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutImprovementProjectsId()

  const { mutateAsync: removePhoto } =
    useDeleteImprovementProjectsIdFilesAttachment()

  const record =
    projectResponse?.status === 200 ? projectResponse.data : undefined
  const isOtherScope = !!record && record.scope !== scope

  // An RGA under `/projetos/rgp/…` (or the reverse) moves to its own route,
  // keeping the tab's state.
  useEffect(() => {
    if (record && record.scope !== scope) {
      router.replace(
        projectFormHref(
          improvementProjectFormPath(record.scope, record.id),
          searchParams
        )
      )
    }
  }, [record, scope, router, searchParams])

  const initialValues = useMemo<ImprovementProjectFormData | undefined>(
    () =>
      record
        ? {
            activity_id: record.activity.id,
            date: record.date,
            concern: record.concern,
            improvement_recommendation: record.improvement_recommendation,
            priority: record.priority,
          }
        : undefined,
    [record]
  )

  async function handleSubmit(
    data: ImprovementProjectFormData,
    files: ImprovementProjectFormFiles
  ) {
    if (!record) return false

    try {
      await mutateAsync({
        id: projectId,
        data: {
          activity_id: data.activity_id,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          concern: data.concern,
          improvement_recommendation: data.improvement_recommendation,
          priority: data.priority,
          // Each photo left blank stays undefined, which leaves its part out
          // and keeps that photo intact (R-18); a picked one replaces only
          // itself (FR-009). Never send an empty File.
          before_photo: files.before_photo,
          after_photo: files.after_photo,
        },
      })
    } catch {
      // Shown from the mutation state.
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetImprovementProjectsIdQueryKey(projectId),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetImprovementProjectsQueryKey(),
    })
    router.push(
      projectsListHrefAfterSave(
        listPath,
        searchParams,
        periods,
        { date: data.date, type: SCOPE_TYPES[scope] },
        { param: 'updated', code: record.code }
      )
    )
    return true
  }

  /**
   * Removes one photo (J11). The API answers 200 with the record, this photo
   * `null` and the other one intact, which goes straight into the detail
   * cache. The tab is where the result shows, as in Reuniões; the date did
   * not change, so the slice the user came from still has the record. A
   * failure (404: removed elsewhere) refreshes both caches and is shown in
   * the modal.
   */
  async function handleConfirmRemovePhoto() {
    if (!record || !removingPhoto) return

    let response: Awaited<ReturnType<typeof removePhoto>>

    try {
      response = await removePhoto({ id: record.id, attachment: removingPhoto })
    } catch (error) {
      void queryClient.invalidateQueries({
        queryKey: getGetImprovementProjectsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetImprovementProjectsQueryKey(),
      })
      throw error
    }

    if (response.status === 200) {
      queryClient.setQueryData<getImprovementProjectsIdResponse>(
        getGetImprovementProjectsIdQueryKey(record.id),
        response
      )
    }
    await queryClient.invalidateQueries({
      queryKey: getGetImprovementProjectsQueryKey(),
    })

    const photo = removingPhoto
    setRemovingPhoto(null)
    router.push(
      projectsListHrefWithFeedback(listPath, searchParams, {
        param: PHOTO_REMOVED_PARAMS[photo],
        code: record.code,
      })
    )
  }

  async function handleDownloadPhoto(photo: ImprovementProjectPhotoKey) {
    if (!record || downloadingPhoto) return

    setDownloadError(null)
    setDownloadingPhoto(photo)

    try {
      await downloadImprovementProjectPhoto(record, photo)
    } catch (error) {
      setDownloadError(error)
    } finally {
      setDownloadingPhoto(null)
    }
  }

  if (!canEdit) {
    return null
  }

  if (isProjectLoading || isPeriodsLoading || isOtherScope) {
    return <ProjectFormSkeleton />
  }

  if (
    isProjectError ||
    isPeriodsError ||
    periodsResponse?.status !== 200 ||
    !record ||
    !initialValues
  ) {
    return (
      <ListErrorState
        title={t('form.loadError')}
        onRetry={() => {
          void refetchProject()
          void refetchPeriods()
        }}
      />
    )
  }

  const errorSource = isUpdateError ? updateError : downloadError
  const errorMessage = errorSource ? translateError(errorSource) : null

  return (
    <>
      <ImprovementProjectForm
        mode="edit"
        scope={scope}
        code={record.code}
        initialValues={initialValues}
        currentPhotos={{
          'before-photo': record.before_photo,
          'after-photo': record.after_photo,
        }}
        periods={periods}
        activities={activities}
        listHref={projectsListHref(listPath, searchParams)}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onRemovePhoto={setRemovingPhoto}
        onDownloadPhoto={(photo) => void handleDownloadPhoto(photo)}
        downloadingPhoto={downloadingPhoto}
      />

      <RemoveProjectFileModal
        code={removingPhoto ? record.code : null}
        fileLabel={removingPhoto ? t(`photos.${removingPhoto}`) : null}
        onConfirm={handleConfirmRemovePhoto}
        onClose={() => setRemovingPhoto(null)}
      />
    </>
  )
}
