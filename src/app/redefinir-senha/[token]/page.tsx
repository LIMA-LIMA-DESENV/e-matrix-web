'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthCard } from '@/components/auth/auth-card'
import { Button, Label, PasswordInput } from '@/components/ui'
import { usePostPasswordReset } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

const MIN_PASSWORD_LENGTH = 8
const REDIRECT_SECONDS = 5

export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)

  const resetSchema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(
              MIN_PASSWORD_LENGTH,
              tv('passwordMin', { min: MIN_PASSWORD_LENGTH })
            ),
          confirmPassword: z.string().min(1, tv('confirmPasswordRequired')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tv('passwordsMismatch'),
          path: ['confirmPassword'],
        }),
    [tv]
  )

  type ResetFormData = z.infer<typeof resetSchema>

  const { mutate, isPending, isSuccess, isError, error } =
    usePostPasswordReset()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  })

  useEffect(() => {
    if (!isSuccess) return

    if (countdown <= 0) {
      router.push('/login')
      return
    }

    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000)

    return () => clearTimeout(timer)
  }, [isSuccess, countdown, router])

  function onSubmit(data: ResetFormData) {
    mutate({ data: { password: data.password }, params: { token } })
  }

  if (isSuccess) {
    return (
      <AuthCard
        icon="check_circle"
        title={t('doneTitle')}
        description={t('doneDescription')}
      >
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-semibold text-on-primary-container shadow-lg shadow-primary/20 transition-all hover:bg-primary active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            login
          </span>
          {t('goToLogin')}
        </Link>
        <p className="mt-4 text-sm text-outline">
          {t('redirecting', { seconds: countdown })}
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon="lock_reset"
      title={t('title')}
      description={t('subtitle')}
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-outline transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_back
          </span>
          {tc('backToLogin')}
        </Link>
      }
    >
      <form className="w-full space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label
            htmlFor="new_password"
            className="ml-1 block text-sm font-semibold text-on-surface-variant"
          >
            {t('newPassword')}
          </Label>
          <PasswordInput
            id="new_password"
            autoComplete="new-password"
            className="h-auto rounded-xl py-3"
            {...register('password')}
          />
          <p
            className={`ml-1 text-[11px] ${errors.password ? 'text-error' : 'text-outline'}`}
          >
            {errors.password?.message ??
              tv('passwordHint', { min: MIN_PASSWORD_LENGTH })}
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirm_password"
            className="ml-1 block text-sm font-semibold text-on-surface-variant"
          >
            {t('confirmPassword')}
          </Label>
          <PasswordInput
            id="confirm_password"
            autoComplete="new-password"
            className="h-auto rounded-xl py-3"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="ml-1 text-[11px] text-error">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {isError && (
          <p role="alert" className="ml-1 text-xs text-error">
            {translateError(error)}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-auto w-full rounded-xl bg-primary-container py-3.5 font-semibold text-on-primary-container shadow-lg shadow-primary/20 hover:bg-primary active:scale-[0.98]"
        >
          {isPending ? tc('saving') : t('submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
