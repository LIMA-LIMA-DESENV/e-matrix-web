'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthCard } from '@/components/auth/auth-card'
import { Button, Input, Label } from '@/components/ui'
import { usePostPasswordForgot } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

function BackToLogin() {
  const t = useTranslations('common')

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 text-sm font-medium text-outline transition-colors hover:text-primary"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden>
        arrow_back
      </span>
      {t('backToLogin')}
    </Link>
  )
}

export default function ForgotPasswordPage() {
  const t = useTranslations('forgotPassword')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')
  const tl = useTranslations('login')
  const translateError = useTranslateError()

  const forgotSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, tv('emailRequired')).email(tv('emailInvalid')),
      }),
    [tv]
  )

  type ForgotFormData = z.infer<typeof forgotSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  })

  const { mutate, isPending, isSuccess, isError, error, reset } =
    usePostPasswordForgot()

  function onSubmit(data: ForgotFormData) {
    mutate({ data: { email: data.email } })
  }

  if (isSuccess) {
    return (
      <AuthCard
        icon="mark_email_read"
        title={t('sentTitle')}
        description={t('sentDescription')}
        footer={
          <>
            <span className="text-sm text-outline">{t('notReceived')} </span>
            <Button
              type="button"
              variant="ghost"
              color="primary"
              className="h-auto p-0 text-sm font-bold hover:bg-transparent hover:underline"
              onClick={() => reset()}
            >
              {tc('retry')}
            </Button>
          </>
        }
      >
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-semibold text-on-primary-container shadow-lg shadow-primary/20 transition-all hover:bg-primary active:scale-[0.98]"
        >
          {tc('backToLogin')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon="key"
      title={t('title')}
      description={t('subtitle')}
      footer={<BackToLogin />}
    >
      <form className="w-full space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="ml-1 block text-sm font-semibold text-on-surface-variant"
          >
            {tl('email')}
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={tl('emailPlaceholder')}
            className="h-auto rounded-xl py-3"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error">{errors.email.message}</p>
          )}
          {isError && (
            <p role="alert" className="mt-1 text-xs text-error">
              {translateError(error)}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-auto w-full rounded-xl bg-primary-container py-3.5 font-semibold text-on-primary-container shadow-lg shadow-primary/20 hover:bg-primary active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            mail
          </span>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
