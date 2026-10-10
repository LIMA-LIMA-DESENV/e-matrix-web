'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button, Card, Label, PasswordInput } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { usePostPasswordChange } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

const MIN_PASSWORD_LENGTH = 8

const fieldClasses =
  'h-14 rounded-xl border-none bg-surface-container-high px-4 font-medium focus:ring-2 focus:ring-primary/20'

export default function ChangePasswordPage() {
  const t = useTranslations('changePassword')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const router = useRouter()
  const { updateUser, user } = useAuth()
  const isMandatoryChange = user?.mustChangePassword ?? false

  const changePasswordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, tv('currentPasswordRequired')),
          newPassword: z
            .string()
            .min(
              MIN_PASSWORD_LENGTH,
              tv('passwordMin', { min: MIN_PASSWORD_LENGTH })
            ),
          confirmPassword: z.string().min(1, tv('confirmPasswordRequired')),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: tv('passwordsMismatch'),
          path: ['confirmPassword'],
        }),
    [tv]
  )

  type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

  const { mutateAsync, isPending, isError, error } = usePostPasswordChange()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onSubmit(data: ChangePasswordFormData) {
    const response = await mutateAsync({
      data: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    })

    if (response.status === 200) {
      updateUser(response.data.user)
      router.push('/dashboard')
    }
  }

  function handleCancel() {
    if (!isMandatoryChange) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold tracking-[0.2em] text-outline uppercase">
            {t('eyebrow')}
          </span>
          <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
            {t('title')}
          </h1>
          <p className="mt-1 max-w-2xl font-medium text-on-surface-variant">
            {isMandatoryChange ? t('descriptionMandatory') : t('description')}
          </p>
        </div>

        {!isMandatoryChange && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            <span className="material-symbols-outlined text-lg" aria-hidden>
              arrow_back
            </span>
            {tc('back')}
          </Button>
        )}
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden rounded-xl border border-outline-variant/20 bg-white p-0 shadow-[0_24px_40px_rgba(0,0,0,0.05)]">
          <div className="h-1.5 w-full bg-primary-container" />
          <div className="p-6 md:p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                <span
                  className="material-symbols-outlined text-3xl"
                  aria-hidden
                >
                  password
                </span>
              </div>
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface">
                  {t('cardTitle')}
                </h2>
                <p className="text-xs font-medium tracking-widest text-outline uppercase">
                  {t('cardSubtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="current_password"
                  className="ml-1 text-sm font-semibold text-on-surface-variant"
                >
                  {t('currentPassword')}
                </Label>
                <PasswordInput
                  id="current_password"
                  autoComplete="current-password"
                  disabled={isPending}
                  className={fieldClasses}
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="ml-1 text-[11px] text-error">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="new_password"
                  className="ml-1 text-sm font-semibold text-on-surface-variant"
                >
                  {t('newPassword')}
                </Label>
                <PasswordInput
                  id="new_password"
                  autoComplete="new-password"
                  disabled={isPending}
                  className={fieldClasses}
                  {...register('newPassword')}
                />
                <p
                  className={`ml-1 text-[11px] ${errors.newPassword ? 'text-error' : 'text-outline'}`}
                >
                  {errors.newPassword?.message ??
                    tv('passwordHint', { min: MIN_PASSWORD_LENGTH })}
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm_password"
                  className="ml-1 text-sm font-semibold text-on-surface-variant"
                >
                  {t('confirmPassword')}
                </Label>
                <PasswordInput
                  id="confirm_password"
                  autoComplete="new-password"
                  disabled={isPending}
                  className={fieldClasses}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="ml-1 text-[11px] text-error">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {isError && (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
          >
            {translateError(error)}
          </div>
        )}

        <div className="fixed right-0 bottom-0 z-40 w-full border-t border-outline-variant/30 bg-white/85 p-6 shadow-[0_-16px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:w-[calc(100%-16rem)]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
            <p className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span
                className="material-symbols-outlined text-base text-outline"
                aria-hidden
              >
                info
              </span>
              {isMandatoryChange ? t('footerMandatory') : t('footer')}
            </p>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              {!isMandatoryChange && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none"
                >
                  {tc('cancel')}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90 sm:flex-none"
              >
                {isPending ? tc('saving') : t('submit')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
