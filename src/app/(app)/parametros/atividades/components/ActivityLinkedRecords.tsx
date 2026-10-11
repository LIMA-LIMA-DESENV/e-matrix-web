import { useTranslations } from 'next-intl'

import type { ActivityLinkedRecords } from '@/http/api'

interface ActivityLinkedRecordsCountsProps {
  linkedRecords: ActivityLinkedRecords
}

/**
 * Counts by type; the API only lists types with at least one record. Used only
 * by the delete modal: the edit page shows no linked records at all (D-8),
 * because changing an activity never undoes a link.
 */
export function ActivityLinkedRecordsCounts({
  linkedRecords,
}: ActivityLinkedRecordsCountsProps) {
  // Typed keys: every `ActivityLinkedRecordType` value needs a label.
  const t = useTranslations('activities.linkedRecords.types')

  return (
    <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/30">
      {linkedRecords.items.map((item) => (
        <li
          key={item.type}
          className="flex items-center justify-between px-4 py-2 text-sm"
        >
          <span className="font-medium text-on-surface">{t(item.type)}</span>
          <span className="font-bold text-ematrix-dark">{item.count}</span>
        </li>
      ))}
    </ul>
  )
}
