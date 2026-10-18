import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@/components/ui'
import type { MeetingTemplateKey } from '@/lib/download-file'

interface MeetingsHeaderProps {
  /** Meetings in the current period slice. */
  totalCount: number
  /** Template being downloaded, if any: one download at a time. */
  downloadingTemplate: MeetingTemplateKey | null
  onDownloadTemplate: (template: MeetingTemplateKey) => void
  /** Undefined for a Viewer, who sees no write action at all (FR-026). */
  onNewMeeting?: () => void
  /**
   * With no period registered every date is refused (FR-006), so the action
   * stays visible but disabled, with the reason (J3, FR-024).
   */
  isNewMeetingDisabled?: boolean
}

/** The two fixed downloads, each offered once (R-20, R-21). */
const TEMPLATES = [
  { key: 'minutes', label: 'downloadMinutesTemplate' },
  { key: 'presence-list', label: 'downloadPresenceListTemplate' },
] as const satisfies readonly { key: MeetingTemplateKey; label: string }[]

/**
 * Title, count, the two templates — the minutes model and the blank
 * attendance list — and "Nova reunião" for who may edit. Neither template
 * depends on having meetings nor on the role (J6).
 */
export function MeetingsHeader({
  totalCount,
  downloadingTemplate,
  onDownloadTemplate,
  onNewMeeting,
  isNewMeetingDisabled = false,
}: MeetingsHeaderProps) {
  const t = useTranslations('meetings')
  const disabledHintId = useId()

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
          {TEMPLATES.map((template) => (
            <Button
              key={template.key}
              type="button"
              variant="outline"
              color="primary"
              onClick={() => onDownloadTemplate(template.key)}
              disabled={downloadingTemplate !== null}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                download
              </span>
              {downloadingTemplate === template.key
                ? t('downloading')
                : t(template.label)}
            </Button>
          ))}

          {onNewMeeting && (
            <Button
              type="button"
              onClick={onNewMeeting}
              disabled={isNewMeetingDisabled}
              aria-describedby={
                isNewMeetingDisabled ? disabledHintId : undefined
              }
              className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                add
              </span>
              {t('newMeeting')}
            </Button>
          )}
        </div>
      </div>

      {onNewMeeting && isNewMeetingDisabled && (
        <p
          id={disabledHintId}
          className="mt-3 text-right text-xs font-medium text-on-surface-variant"
        >
          {t('newMeetingDisabledHint')}
        </p>
      )}
    </div>
  )
}
