'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import {
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
} from '@/components/list'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  type Program,
  type ProgramList,
  type ProgramMaterial,
  ProgramType,
  useGetPrograms,
} from '@/http/api'
import {
  downloadProgramFile,
  downloadProgramMaterial,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import {
  DeleteProgramModal,
  ProgramCard,
  ProgramDetailsModal,
  type ProgramRef,
  ProgramScoreCard,
  useProgramTypeLabel,
} from './components'

/** Set by `novo/` after a successful create: `?created=<id>`. */
const CREATED_PARAM = 'created'
/** Set by `[id]/editar/` after a successful update: `?updated=<id>`. */
const UPDATED_PARAM = 'updated'
/** Set by `[id]/editar/` after removing the file: `?fileRemoved=<id>`. */
const FILE_REMOVED_PARAM = 'fileRemoved'
/** Set by `[id]/editar/` after a delete: `?deleted=<type>`. */
const DELETED_PARAM = 'deleted'

function isProgramType(value: string | null): value is ProgramType {
  return value !== null && Object.hasOwn(ProgramType, value)
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
    />
  )
}

function ProgramsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <SkeletonBlock className="h-40 max-w-md" />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <SkeletonBlock key={index} className="h-56" />
        ))}
      </div>
    </div>
  )
}

export default function ProgramaPage() {
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <ProgramsList />
    </Suspense>
  )
}

/**
 * Items of the ergonomics program and its current score (J1 to J6), read by
 * every role. One `GET /programs` serves the whole screen: the items come in
 * the API's order (type, then creation, H-3) and are shown as they come, with
 * no sort, search or pages (D-11), and the score is derived by the API, never
 * here (D-2), so every write refetches it. Every role gets the detail and the
 * downloads; "Novo item", "Editar" and "Excluir" only `canEdit` (FR-020).
 */
function ProgramsList() {
  const t = useTranslations('programs')
  const typeLabel = useProgramTypeLabel()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<Program | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProgramRef | null>(null)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null
  )
  const [downloadingMaterial, setDownloadingMaterial] =
    useState<ProgramMaterial | null>(null)

  const { data, isLoading, isError, refetch } = useGetPrograms()

  const list = useMemo<ProgramList | null>(
    () => (data?.status === 200 ? data.data : null),
    [data]
  )
  const items = useMemo(() => list?.items ?? [], [list])

  // Success message after a create, an update, a file removal or a delete
  // from the edit page, then the param is dropped so a reload does not show
  // it again.
  const createdId = searchParams.get(CREATED_PARAM)
  const updatedId = searchParams.get(UPDATED_PARAM)
  const fileRemovedId = searchParams.get(FILE_REMOVED_PARAM)
  const deletedType = searchParams.get(DELETED_PARAM)

  useEffect(() => {
    const changedId = createdId ?? updatedId ?? fileRemovedId
    if (!changedId && !deletedType) return
    if (changedId && !list) return

    const changed = changedId
      ? items.find((record) => record.id === changedId)
      : undefined

    if (changed) {
      const type = typeLabel(changed.type)
      setFeedback({
        tone: 'success',
        text: createdId
          ? t('created', { type })
          : updatedId
            ? t('updated', { type })
            : t('fileRemoved', { type }),
      })
    } else if (isProgramType(deletedType)) {
      setFeedback({
        tone: 'success',
        text: t('deleted', { type: typeLabel(deletedType) }),
      })
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete(CREATED_PARAM)
    params.delete(UPDATED_PARAM)
    params.delete(FILE_REMOVED_PARAM)
    params.delete(DELETED_PARAM)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    createdId,
    updatedId,
    fileRemovedId,
    deletedType,
    items,
    list,
    pathname,
    router,
    searchParams,
    t,
    typeLabel,
  ])

  function openCreate() {
    router.push('/programa/novo')
  }

  function openEdit(record: Program) {
    router.push(`/programa/${record.id}/editar`)
  }

  function openDelete(record: Program) {
    setFeedback(null)
    setPendingDelete(record)
  }

  function handleDeleted(record: ProgramRef) {
    setPendingDelete(null)
    setFeedback({
      tone: 'success',
      text: t('deleted', { type: typeLabel(record.type) }),
    })
  }

  function renderCreateButton(className?: string) {
    return (
      <Button type="button" onClick={openCreate} className={className}>
        <span className="material-symbols-outlined text-lg" aria-hidden>
          add
        </span>
        {t('newItem')}
      </Button>
    )
  }

  async function handleDownloadFile(record: Program) {
    if (!record.file || downloadingFileId) return

    setFeedback(null)
    setDownloadingFileId(record.id)

    try {
      await downloadProgramFile(record)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingFileId(null)
    }
  }

  async function handleDownloadMaterial(material: ProgramMaterial) {
    if (downloadingMaterial) return

    setFeedback(null)
    setDownloadingMaterial(material)

    try {
      await downloadProgramMaterial(material)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingMaterial(null)
    }
  }

  function renderContent() {
    if (isLoading) {
      return <ProgramsSkeleton />
    }

    if (isError || !list) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={() => void refetch()}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="max-w-md">
          <ProgramScoreCard score={list.score} />
        </div>

        {items.length === 0 ? (
          <ListEmptyState
            variant="no-records"
            icon="diamond"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={canEdit ? renderCreateButton('mt-2') : undefined}
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((record) => (
              <li key={record.id} className="flex">
                <ProgramCard
                  record={record}
                  onOpenDetails={setSelected}
                  onEdit={canEdit ? openEdit : undefined}
                  onDelete={canEdit ? openDelete : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {t('title')}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {t('description')}
          </p>
          {list && (
            <p className="mt-3 text-sm text-outline">
              {t('count', { count: items.length })}
            </p>
          )}
        </div>
        {canEdit && renderCreateButton('shrink-0 self-start')}
      </div>

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      {renderContent()}

      <ProgramDetailsModal
        record={selected}
        isDownloadingFile={Boolean(
          selected && downloadingFileId === selected.id
        )}
        downloadingMaterial={downloadingMaterial}
        onClose={() => setSelected(null)}
        onDownloadFile={handleDownloadFile}
        onDownloadMaterial={handleDownloadMaterial}
      />

      <DeleteProgramModal
        record={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
