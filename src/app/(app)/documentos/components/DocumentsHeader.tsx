import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'

interface DocumentsHeaderProps {
  totalCount: number
  isDownloadingTemplate: boolean
  onDownloadTemplate: () => void
  /** Undefined for a Viewer, who sees no write action at all (FR-024). */
  onNewDocument?: () => void
}

export function DocumentsHeader({
  totalCount,
  isDownloadingTemplate,
  onDownloadTemplate,
  onNewDocument,
}: DocumentsHeaderProps) {
  const t = useTranslations('documents')

  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {t('title')}
        </h1>
        <p className="mt-1 font-medium text-on-surface-variant">
          {t('description')}
        </p>
        <p className="mt-3 text-sm text-outline">
          {t('count', { count: totalCount })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Fixed action: the template does not depend on having documents,
            nor on the role (J4). */}
        <Button
          type="button"
          variant="outline"
          color="primary"
          onClick={onDownloadTemplate}
          disabled={isDownloadingTemplate}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            download
          </span>
          {isDownloadingTemplate ? t('downloading') : t('downloadTemplate')}
        </Button>

        {onNewDocument && (
          <Button
            type="button"
            onClick={onNewDocument}
            className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              add
            </span>
            {t('newDocument')}
          </Button>
        )}
      </div>
    </div>
  )
}
