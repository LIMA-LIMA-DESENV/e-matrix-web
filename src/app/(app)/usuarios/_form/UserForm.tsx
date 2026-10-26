'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button, Card, Input, Label, PasswordInput } from '@/components/ui'
import { UserRole } from '@/http/api'

import { RoleSelector } from './RoleSelector'
import {
  MIN_PASSWORD_LENGTH,
  makeUserSchema,
  type Translate,
  type UserFormData,
  userFormDefaultValues,
} from './schema'

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

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
        <span className="material-symbols-outlined text-3xl" aria-hidden>
          {icon}
        </span>
      </div>
      <div>
        <h2 className="font-headline text-xl font-bold text-on-surface">
          {title}
        </h2>
        <p className="text-xs font-medium tracking-widest text-outline uppercase">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

interface UserFormProps {
  mode: 'create' | 'edit'
  initialValues?: UserFormData
  /** Editing your own user: you cannot drop your own admin role. */
  isCurrentUser?: boolean
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (data: UserFormData) => Promise<void>
}

export function UserForm({
  mode,
  initialValues,
  isCurrentUser = false,
  isSubmitting,
  errorMessage,
  onSubmit,
}: UserFormProps) {
  const t = useTranslations('users.form')
  const tu = useTranslations('users')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeUserSchema(tv as unknown as Translate, mode),
    [tv, mode]
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? userFormDefaultValues,
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
            <Link href="/usuarios" className="hover:text-primary">
              {tu('title')}
            </Link>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              chevron_right
            </span>
            <span>{isCreate ? t('newTitle') : t('editTitle')}</span>
          </nav>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {isCreate ? t('newTitle') : (initialValues?.name ?? t('editTitle'))}
          </h1>
          <p className="mt-1 font-medium text-on-surface-variant">
            {isCreate ? t('newDescription') : t('editDescription')}
          </p>
        </div>
        <Link
          href="/usuarios"
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
        <div className="space-y-10 p-6 md:p-8">
          <section>
            <SectionHeading
              icon="badge"
              title={t('identityTitle')}
              subtitle={t('identitySubtitle')}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label={t('name')}
                htmlFor="name"
                error={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder={t('namePlaceholder')}
                  disabled={isSubmitting}
                  className={inputClasses}
                  {...register('name')}
                />
              </Field>
              <Field
                label={t('email')}
                htmlFor="email"
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  disabled={isSubmitting}
                  className={inputClasses}
                  {...register('email')}
                />
              </Field>
              {isCreate && (
                <Field
                  label={t('password')}
                  htmlFor="password"
                  error={errors.password?.message}
                  help={`${tv('passwordHint', { min: MIN_PASSWORD_LENGTH })} ${t('passwordHint')}`}
                >
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className={inputClasses}
                    {...register('password')}
                  />
                </Field>
              )}
            </div>
          </section>

          <section>
            <SectionHeading
              icon="admin_panel_settings"
              title={t('roleTitle')}
              subtitle={t('roleSubtitle')}
            />
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <RoleSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  disabledRoles={
                    isCurrentUser ? [UserRole.user, UserRole.viewer] : []
                  }
                />
              )}
            />
            {errors.role && (
              <p className="mt-2 text-xs font-medium text-error">
                {errors.role.message}
              </p>
            )}
          </section>
        </div>
      </Card>

      <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-var(--shell-sidebar-width,16rem))]">
        <div className="mx-auto flex max-w-6xl justify-end gap-3">
          <Link
            href="/usuarios"
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
