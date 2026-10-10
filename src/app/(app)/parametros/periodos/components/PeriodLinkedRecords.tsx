import { useTranslations } from 'next-intl'

import type { PeriodLinkedRecords as PeriodLinkedRecordsData } from '@/http/api'

interface LinkedRecordsCountsProps {
  linkedRecords: PeriodLinkedRecordsData
}

/** Counts by type; the API only lists types with at least one record. */
export function LinkedRecordsCounts({
  linkedRecords,
}: LinkedRecordsCountsProps) {
  // Typed keys: every `PeriodLinkedRecordType` value needs a label.
  const t = useTranslations('periods.linkedRecords.types')

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

interface PeriodLinkedRecordsProps {
  linkedRecords: PeriodLinkedRecordsData
}

/** "Registros ligados" panel of the edit page. */
export function PeriodLinkedRecords({
  linkedRecords,
}: PeriodLinkedRecordsProps) {
  const t = useTranslations('periods.linkedRecords')
  const hasLinkedRecords = linkedRecords.total > 0

  return (
    <section
      aria-labelledby="period-linked-records-title"
      className="space-y-4 rounded-xl border border-outline-variant/20 bg-white p-6 shadow-[0_24px_40px_rgba(0,0,0,0.05)] md:p-8"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
          <span className="material-symbols-outlined text-3xl" aria-hidden>
            link
          </span>
        </div>
        <div>
          <h2
            id="period-linked-records-title"
            className="font-headline text-xl font-bold text-on-surface"
          >
            {t('title')}
          </h2>
          <p className="text-xs font-medium tracking-widest text-outline uppercase">
            {t('total', { count: linkedRecords.total })}
          </p>
        </div>
      </div>

      {hasLinkedRecords ? (
        <>
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
          >
            {t('warning')}
          </div>
          <LinkedRecordsCounts linkedRecords={linkedRecords} />
        </>
      ) : (
        <p className="text-sm text-on-surface-variant">{t('none')}</p>
      )}
    </section>
  )
}
