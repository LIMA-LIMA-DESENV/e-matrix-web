import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@/components/ui'
import type { TrainingContent } from '@/http/api'
import type { TrainingTemplateKey } from '@/lib/download-file'

import { TRAINING_CONTENTS } from './listing'
import { TrainingContentBadge } from './TrainingContentBadge'

interface TrainingsHeaderProps {
  /** Trainings in the current period slice. */
  totalCount: number
  /** Template being downloaded, if any: one download at a time. */
  downloadingTemplate: TrainingTemplateKey | null
  onDownloadTemplate: (template: TrainingTemplateKey) => void
  /** Undefined for a Viewer, who sees no write action at all (FR-027). */
  onNewTraining?: () => void
  /**
   * With no period registered every date is refused (FR-006), so the action
   * stays visible but disabled, with the reason (J3, AC-026).
   */
  isNewTrainingDisabled?: boolean
}

/**
 * Title, count, "Novo treinamento" for who may edit, and the six fixed
 * downloads: the blank attendance list and the presentation of each content.
 * None of the downloads depends on having trainings nor on the role (J6).
 */
export function TrainingsHeader({
  totalCount,
  downloadingTemplate,
  onDownloadTemplate,
  onNewTraining,
  isNewTrainingDisabled = false,
}: TrainingsHeaderProps) {
  const t = useTranslations('trainings')
  const isDownloadingPresenceList = downloadingTemplate === 'presence-list'
  const disabledHintId = useId()

  return (
    <div className="mb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            color="primary"
            onClick={() => onDownloadTemplate('presence-list')}
            disabled={downloadingTemplate !== null}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              download
            </span>
            {isDownloadingPresenceList
              ? t('downloading')
              : t('downloadPresenceListTemplate')}
          </Button>

          {onNewTraining && (
            <Button
              type="button"
              onClick={onNewTraining}
              disabled={isNewTrainingDisabled}
              aria-describedby={
                isNewTrainingDisabled ? disabledHintId : undefined
              }
              className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                add
              </span>
              {t('newTraining')}
            </Button>
          )}
        </div>
      </div>

      {onNewTraining && isNewTrainingDisabled && (
        <p
          id={disabledHintId}
          className="-mt-3 mb-6 text-right text-xs font-medium text-on-surface-variant"
        >
          {t('newTrainingDisabledHint')}
        </p>
      )}

      {/* The legacy content cards offered each presentation for download. */}
      <section
        aria-labelledby="training-templates-title"
        className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-4 shadow-sm"
      >
        <h2
          id="training-templates-title"
          className="mb-3 text-xs font-bold uppercase tracking-wide text-outline"
        >
          {t('templatesTitle')}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {TRAINING_CONTENTS.map((content: TrainingContent) => (
            <li key={content}>
              <TrainingContentBadge
                content={content}
                onDownloadTemplate={onDownloadTemplate}
                isDownloadingTemplate={downloadingTemplate === content}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
