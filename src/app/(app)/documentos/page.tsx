'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import {
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  paginate,
  type RowActionsMenuProps,
  sortItems,
  useListState,
} from '@/components/list'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { type Document, useGetDocuments } from '@/http/api'
import {
  downloadDocumentFile,
  downloadESocialTemplate,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import {
  DeleteDocumentModal,
  DOCUMENT_LIST_CONFIG,
  DocumentDetailsModal,
  DocumentsFilterBar,
  DocumentsHeader,
  DocumentsTable,
  getDocumentSortColumns,
  matchesDocumentSearch,
  useDocumentMaterialLabel,
  useDocumentTableColumns,
} from './components'

/** Set by `novo/` after a successful create: `?created=<id>`. */
const CREATED_PARAM = 'created'
/** Set by `[id]/editar/` after a successful update: `?updated=<id>`. */
const UPDATED_PARAM = 'updated'
/** Set by `[id]/editar/` after removing the file: `?fileRemoved=<id>`. */
const FILE_REMOVED_PARAM = 'fileRemoved'
/** Set by `[id]/editar/` after a delete: `?deleted=<name>`. */
const DELETED_PARAM = 'deleted'

type DocumentRef = Pick<Document, 'id' | 'name'>

export default function DocumentosPage() {
  const columns = useDocumentTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <DocumentsList />
    </Suspense>
  )
}

/**
 * Documents listing. Unlike `/usuarios` and `/parametros/*`, this screen is
 * for every role — there is no redirect by profile, and a Viewer is expected
 * here (J10). What separates reading from editing is `canEdit`: a Viewer gets
 * the detail and the downloads, and no write action at all (FR-024).
 */
function DocumentsList() {
  const t = useTranslations('documents')
  const tc = useTranslations('common')
  const columns = useDocumentTableColumns()
  const materialLabel = useDocumentMaterialLabel()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const list = useListState(DOCUMENT_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<Document | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DocumentRef | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)

  const {
    data: documentsResponse,
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
    refetch: refetchDocuments,
  } = useGetDocuments()

  const documents = useMemo<Document[]>(
    () => (documentsResponse?.status === 200 ? documentsResponse.data : []),
    [documentsResponse]
  )

  // Success message after a create, an update, a file removal or a delete
  // from the edit page, then the param is dropped so a reload does not show
  // it again.
  const createdId = searchParams.get(CREATED_PARAM)
  const updatedId = searchParams.get(UPDATED_PARAM)
  const fileRemovedId = searchParams.get(FILE_REMOVED_PARAM)
  const deletedName = searchParams.get(DELETED_PARAM)

  useEffect(() => {
    const changedId = createdId ?? updatedId ?? fileRemovedId
    if (!changedId && !deletedName) return
    if (changedId && documentsResponse?.status !== 200) return

    const changed = changedId
      ? documents.find((record) => record.id === changedId)
      : undefined

    if (changed) {
      setFeedback({
        tone: 'success',
        text: createdId
          ? t('created', { name: changed.name })
          : updatedId
            ? t('updated', { name: changed.name })
            : t('fileRemoved', { name: changed.name }),
      })
    } else if (deletedName) {
      setFeedback({
        tone: 'success',
        text: t('deleted', { name: deletedName }),
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
    deletedName,
    documents,
    documentsResponse,
    pathname,
    router,
    searchParams,
    t,
  ])

  const { q: search, sortState } = list
  const material = list.filters.material

  const sortColumns = useMemo(
    () => getDocumentSortColumns(materialLabel),
    [materialLabel]
  )

  const visibleDocuments = useMemo(() => {
    const filtered = documents.filter(
      (record) =>
        (!material || record.material === material) &&
        matchesDocumentSearch(record, search, materialLabel)
    )

    return sortItems(
      filtered,
      sortColumns,
      sortState,
      DOCUMENT_LIST_CONFIG.defaultSort
    )
  }, [documents, material, search, materialLabel, sortColumns, sortState])

  const pageData = paginate(visibleDocuments, list.page)

  function openCreate() {
    router.push('/documentos/novo')
  }

  function openEdit(record: Document) {
    router.push(`/documentos/${record.id}/editar`)
  }

  /**
   * "Visualizar" is offered to every role; editing and deleting only to who
   * may edit (FR-024). The menu renders nothing when the list is empty.
   */
  function getRowActions(record: Document): RowActionsMenuProps {
    const view = {
      label: tc('view'),
      icon: 'visibility',
      onSelect: () => setSelected(record),
    }

    if (!canEdit) {
      return { edit: [view] }
    }

    return {
      edit: [
        view,
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(record) },
      ],
      exit: [
        {
          label: t('deleteAction'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(record)
          },
        },
      ],
    }
  }

  function handleDeleted(record: DocumentRef) {
    setPendingDelete(null)
    setFeedback({ tone: 'success', text: t('deleted', { name: record.name }) })
  }

  async function handleDownloadFile(record: Document) {
    if (!record.file || downloadingId) return

    setFeedback(null)
    setDownloadingId(record.id)

    try {
      await downloadDocumentFile(record)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDownloadTemplate() {
    if (isDownloadingTemplate) return

    setFeedback(null)
    setIsDownloadingTemplate(true)

    try {
      await downloadESocialTemplate()
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  function renderContent() {
    if (isDocumentsLoading) {
      return <ListTableSkeleton columns={columns} />
    }

    if (isDocumentsError) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={() => void refetchDocuments()}
        />
      )
    }

    if (documents.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="description"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            canEdit ? (
              <Button type="button" onClick={openCreate} className="mt-2">
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  add
                </span>
                {t('newDocument')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    if (visibleDocuments.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('noResultsTitle')}
          description={t('noResultsDescription')}
          onClearFilters={list.clearFilters}
        />
      )
    }

    return (
      <DocumentsTable
        documents={pageData.items}
        search={search}
        sort={sortState}
        downloadingId={downloadingId}
        onSort={list.toggleSort}
        getRowActions={getRowActions}
        onOpenDetails={setSelected}
        onDownloadFile={handleDownloadFile}
        footer={
          <ListPagination
            page={pageData.page}
            pageCount={pageData.pageCount}
            total={pageData.total}
            start={pageData.start}
            end={pageData.end}
            itemLabel={t('itemLabel', { count: pageData.total })}
            onPageChange={list.setPage}
          />
        }
      />
    )
  }

  return (
    <div>
      <DocumentsHeader
        totalCount={documents.length}
        isDownloadingTemplate={isDownloadingTemplate}
        onDownloadTemplate={() => void handleDownloadTemplate()}
        onNewDocument={canEdit ? openCreate : undefined}
      />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <DocumentsFilterBar
        search={search}
        material={material}
        hasActiveFilters={list.hasActiveFilters}
        onSearchChange={list.setSearch}
        onMaterialChange={(value) => list.setFilter('material', value)}
        onClearFilters={list.clearFilters}
      />

      {renderContent()}

      <DocumentDetailsModal
        record={selected}
        isDownloading={Boolean(selected && downloadingId === selected.id)}
        onClose={() => setSelected(null)}
        onDownloadFile={handleDownloadFile}
      />

      <DeleteDocumentModal
        record={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
