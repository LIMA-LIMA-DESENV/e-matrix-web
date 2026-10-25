import { useFormatter, useTranslations } from 'next-intl'

import { Badge, Button, Card } from '@/components/ui'
import type { Program } from '@/http/api'

import { useProgramTypeLabel } from './ProgramTypeLabel'

interface ProgramCardProps {
  record: Program
  onOpenDetails: (record: Program) => void
  /** Offered only to who may edit (FR-020); absent for a Viewer. */
  onEdit?: (record: Program) => void
  onDelete?: (record: Program) => void
}

/**
 * One item of the program (R-7): the translated type as the title, the
 * question cut to a few lines, the completed percentage and the "Completo"
 * badge at 100%. "Visualizar" is offered to every role; "Editar" and
 * "Excluir" only when the page passes their handlers, which it does for
 * `canEdit` alone.
 */
export function ProgramCard({
  record,
  onOpenDetails,
  onEdit,
  onDelete,
}: ProgramCardProps) {
  const t = useTranslations('programs')
  const tc = useTranslations('common')
  const format = useFormatter()
  const typeLabel = useProgramTypeLabel()
  const isComplete = record.completed_percentage === 100
  const percentage = format.number(record.completed_percentage / 100, {
    style: 'percent',
    maximumFractionDigits: 0,
  })

  return (
    <Card className="flex w-full flex-col border border-outline-variant/30 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-headline text-base font-bold text-on-surface">
          {typeLabel(record.type)}
        </h2>
        {isComplete && (
          <Badge color="success" className="shrink-0">
            <span className="material-symbols-outlined text-sm" aria-hidden>
              verified
            </span>
            {t('complete')}
          </Badge>
        )}
      </div>

      <p
        className="mt-3 line-clamp-3 break-words text-sm text-on-surface-variant"
        title={record.question}
      >
        {record.question}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-outline">
          <span>{t('fields.completedPercentage')}</span>
          <span className="text-on-surface">{percentage}</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${record.completed_percentage}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="error"
              onClick={() => onDelete(record)}
              aria-label={t('deleteItem', { type: typeLabel(record.type) })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                delete
              </span>
              {t('deleteAction')}
            </Button>
          )}
          {onEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="primary"
              onClick={() => onEdit(record)}
              aria-label={t('editItem', { type: typeLabel(record.type) })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                edit
              </span>
              {tc('edit')}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            color="primary"
            onClick={() => onOpenDetails(record)}
            aria-label={t('viewItem', { type: typeLabel(record.type) })}
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              visibility
            </span>
            {tc('view')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
