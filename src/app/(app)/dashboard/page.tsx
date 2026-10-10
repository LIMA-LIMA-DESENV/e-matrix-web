'use client'

import { useTranslations } from 'next-intl'

import { Badge, Card } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

// Mirrors the module order of the legacy E-Matrix; flip `done` as each module
// is migrated.
const modules = [
  { key: 'users', done: true },
  { key: 'managementPlan', done: false },
  { key: 'programs', done: false },
  { key: 'documents', done: false },
  { key: 'projects', done: false },
  { key: 'trainings', done: false },
  { key: 'meetings', done: false },
  { key: 'matrix', done: false },
  { key: 'periods', done: true },
  { key: 'parameters', done: false },
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
