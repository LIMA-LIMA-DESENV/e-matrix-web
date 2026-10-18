import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { Badge } from '@/components/ui'
import { TrainingContent } from '@/http/api'

/** Icon of each content, shared by the badge and the form's radio cards. */
export const TRAINING_CONTENT_ICONS: Record<TrainingContent, string> = {
  [TrainingContent.producao]: 'factory',
  [TrainingContent.escritorios]: 'business_center',
  [TrainingContent['novos-funcionarios']]: 'person_add',
  [TrainingContent.basico]: 'school',
  [TrainingContent.avancado]: 'workspace_premium',
}

/**
 * Translated content label. The search and the content column use it too, so
 * the listing reads and orders in the user's language.
 */
export function useTrainingContentLabel() {
  const t = useTranslations('trainings.contents')

  return useCallback((content: TrainingContent) => t(content), [t])
}

interface TrainingContentBadgeProps {
  content: TrainingContent
  /**
   * Offers the presentation template of this content next to the label
   * (R-22). Omitted where the badge only identifies the record.
   */
  onDownloadTemplate?: (content: TrainingContent) => void
  isDownloadingTemplate?: boolean
}

export function TrainingContentBadge({
  content,
  onDownloadTemplate,
  isDownloadingTemplate = false,
}: TrainingContentBadgeProps) {
  const t = useTranslations('trainings')
  const contentLabel = useTrainingContentLabel()
  const label = contentLabel(content)

  return (
    <span className="inline-flex items-center gap-1">
      <Badge color="primary">
        <span className="material-symbols-outlined text-sm" aria-hidden>
          {TRAINING_CONTENT_ICONS[content]}
        </span>
        {label}
      </Badge>

      {onDownloadTemplate && (
        <button
          type="button"
          onClick={() => onDownloadTemplate(content)}
          disabled={isDownloadingTemplate}
          title={t('downloadContentTemplate', { content: label })}
          aria-label={t('downloadContentTemplate', { content: label })}
          className="inline-flex cursor-pointer items-center rounded-full p-1 text-primary transition-colors hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            {isDownloadingTemplate ? 'hourglass_top' : 'download'}
          </span>
        </button>
      )}
    </span>
  )
}
