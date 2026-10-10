import { useTranslations } from 'next-intl'

import {
  Pagination,
  PaginationButton,
  PaginationControls,
  PaginationInfo,
} from '@/components/ui'

interface ListPaginationProps {
  page: number
  pageCount: number
  total: number
  start: number
  end: number
  /** Noun shown after the total, already pluralized for `total`. */
  itemLabel: string
  onPageChange: (page: number) => void
}

/**
 * "Showing X–Y of Z" footer. Z is the total after search and filters; the
 * footer is hidden when there is nothing to show.
 */
export function ListPagination({
  page,
  pageCount,
  total,
  start,
  end,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  const t = useTranslations('list')

  if (total === 0) return null

  return (
    <Pagination className="border-t border-outline-variant/10 bg-surface-container-low/30 px-6 py-4">
      <PaginationInfo className="text-xs font-medium">
        {t.rich('showing', {
          start,
          end,
          total,
          itemLabel,
          strong: (chunks) => (
            <span className="font-bold text-primary">{chunks}</span>
          ),
        })}
      </PaginationInfo>
      <PaginationControls className="gap-2">
        <PaginationButton
          type="button"
          aria-label={t('previousPage')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-outline-variant/30 p-2"
        >
          <span className="material-symbols-outlined text-sm">
            chevron_left
          </span>
        </PaginationButton>
        <span className="text-xs font-medium text-on-surface-variant">
          {t.rich('pageOf', {
            page,
            pageCount,
            strong: (chunks) => (
              <span className="font-bold text-primary">{chunks}</span>
            ),
          })}
        </span>
        <PaginationButton
          type="button"
          aria-label={t('nextPage')}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-outline-variant/30 p-2"
        >
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
        </PaginationButton>
      </PaginationControls>
    </Pagination>
  )
}
