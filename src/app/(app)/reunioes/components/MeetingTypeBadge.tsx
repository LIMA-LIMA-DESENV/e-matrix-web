import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { Badge } from '@/components/ui'
import { MeetingType } from '@/http/api'

/** Icon of each type. */
export const MEETING_TYPE_ICONS: Record<MeetingType, string> = {
  [MeetingType['comite-ergonomia']]: 'groups',
  [MeetingType.projetos]: 'list_alt',
  [MeetingType['diversas-areas']]: 'diversity_3',
}

/**
 * Translated type label. The search and the type column use it too, so the
 * listing reads and orders in the user's language.
 */
export function useMeetingTypeLabel() {
  const t = useTranslations('meetings.types')

  return useCallback((type: MeetingType) => t(type), [t])
}

/** Identifies the type only: no type offers a download (R-21, D-14). */
export function MeetingTypeBadge({ type }: { type: MeetingType }) {
  const typeLabel = useMeetingTypeLabel()

  return (
    <Badge color="primary">
      <span className="material-symbols-outlined text-sm" aria-hidden>
        {MEETING_TYPE_ICONS[type]}
      </span>
      {typeLabel(type)}
    </Badge>
  )
}
