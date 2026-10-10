'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Button, Card, Input, Label } from '@/components/ui'

import {
  MAX_DESCRIPTION_LENGTH,
  makePeriodSchema,
  type PeriodFormData,
  periodFormDefaultValues,
  type Translate,
} from './schema'

const LIST_HREF = '/parametros/periodos'

const inputClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

function Field({
  label,
  htmlFor,
  error,
  help,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="ml-1 text-sm font-semibold text-on-surface-variant"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : (
        help && <p className="text-xs text-on-surface-variant">{help}</p>
      )}
    </div>
  )
}

interface PeriodFormProps {
  mode: 'create' | 'edit'
  initialValues?: PeriodFormData
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (data: PeriodFormData) => Promise<void>
  /** Edit only: shows "Excluir" in the action bar. */
  onDelete?: () => void
  /** Shown below the fields, e.g. the linked records panel. */
  children?: ReactNode
}

export function PeriodForm({
  mode,
  initialValues,
  isSubmitting,
  errorMessage,
  onSubmit,
  onDelete,
  children,
}: PeriodFormProps) {
  const t = useTranslations('periods.form')
  const tv = useTranslations('periods.validation')
  const tp = useTranslations('parameters')
  const tps = useTranslations('periods')
  const tc = useTranslations('common')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makePeriodSchema(tv as unknown as Translate),
    [tv]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeriodFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? periodFormDefaultValues,
  })

  useEffect(() => {
    if (initialValues) reset(initialValues)
  }, [initialValues, reset])

  const isCreate = mode === 'create'

  return (
    <form className="space-y-6 pb-32" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-outline uppercase">
            <Link href={LIST_HREF} className="hover:text-primary">
              {tp('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <Link href={LIST_HREF} className="hover:text-primary">
              {tp('tabs.periods')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{isCreate ? t('newTitle') : t('editTitle')}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {isCreate
              ? t('newTitle')
              : (initialValues?.description ?? t('editTitle'))}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate ? t('newDescription') : t('editDescription')}
          </p>
        </div>
        <Link
          href={LIST_HREF}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high sm:self-auto"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            arrow_back
          </span>
          {tc('back')}
        </Link>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
        >
          {errorMessage}
        </div>
      )}

      <Card className="overflow-hidden rounded-xl border border-outline-variant/20 bg-white p-0 shadow-[0_24px_40px_rgba(0,0,0,0.05)]">
        <div className="h-1.5 w-full bg-primary-container" />
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:p-8">
          <div className="md:col-span-2">
            <Field
              label={t('description')}
              htmlFor="description"
              error={errors.description?.message}
              help={tv('descriptionHint', { max: MAX_DESCRIPTION_LENGTH })}
            >
              <Input
                id="description"
                placeholder={t('descriptionPlaceholder')}
                disabled={isSubmitting}
                className={inputClasses}
                {...register('description')}
              />
            </Field>
          </div>
          <Field
            label={t('startDate')}
            htmlFor="start_date"
            error={errors.start_date?.message}
          >
            <Input
              id="start_date"
              type="date"
              disabled={isSubmitting}
              className={inputClasses}
              {...register('start_date')}
            />
          </Field>
          <Field
            label={t('endDate')}
            htmlFor="end_date"
            error={errors.end_date?.message}
            help={tv('endDateHint')}
          >
            <Input
              id="end_date"
              type="date"
              disabled={isSubmitting}
              className={inputClasses}
              {...register('end_date')}
            />
          </Field>
        </div>
      </Card>

      {children}

      <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-16rem)]">
        <div className="mx-auto flex max-w-6xl justify-end gap-3">
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              color="error"
              onClick={onDelete}
              disabled={isSubmitting}
              className="mr-auto rounded-xl"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                delete
              </span>
              {tps('deleteAction')}
            </Button>
          )}
          <Link
            href={LIST_HREF}
            className="inline-flex items-center rounded-lg px-4 text-sm font-medium text-outline hover:text-on-surface"
          >
            {tc('cancel')}
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
          >
            {isSubmitting
              ? isCreate
                ? t('creating')
                : tc('saving')
              : isCreate
                ? t('create')
                : t('update')}
          </Button>
        </div>
      </div>
    </form>
  )
}
