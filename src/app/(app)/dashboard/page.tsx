'use client'

import { useTranslations } from 'next-intl'

import { Badge, Card } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

// Migration order, not the legacy sidebar order: what is already migrated,
// then the planned order for the rest. The standalone modules come first
// (documents brings the attachment endpoints the next ones reuse), then the
// ones that own records linked to a period or an activity, and the matrix
// last because it is the only one linked to both. Flip `done` as each lands.
const modules = [
  { key: 'users', done: true },
  { key: 'periods', done: true },
  { key: 'activities', done: true },
  { key: 'parameters', done: true },
  { key: 'documents', done: true },
  { key: 'trainings', done: true },
  { key: 'meetings', done: true },
  { key: 'managementPlan', done: true },
  { key: 'programs', done: false },
  { key: 'projects', done: false },
  { key: 'matrix', done: false },
] as const

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tn = useTranslations('nav')
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {t('greeting', { name: user?.name ?? '' })}
        </h1>
        <p className="mt-2 max-w-3xl font-medium text-on-surface-variant">
          {t('description')}
        </p>
      </div>

      <Card className="border border-outline-variant/30 p-6">
        <h2 className="mb-4 font-headline text-lg font-bold text-on-surface">
          {t('migrationTitle')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <li
              key={module.key}
              className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm font-medium"
            >
              {tn(module.key)}
              <Badge color={module.done ? 'success' : 'neutral'}>
                {module.done ? t('done') : t('pending')}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
