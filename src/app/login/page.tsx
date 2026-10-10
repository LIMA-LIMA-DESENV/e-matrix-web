'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { LanguageSwitcher } from '@/components/language-switcher'
import { Button, Copyright, Input, Label, PasswordInput } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { usePostSessions } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

const fieldClasses =
  'h-auto rounded-xl border-none bg-surface-container-high px-4 py-3.5 text-on-surface placeholder:text-outline focus:bg-surface-container-highest focus:ring-2 focus:ring-primary/20'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const t = useTranslations('login')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user, signIn } = useAuth()
  const sessionExpired = searchParams.get('reason') === 'session-expired'
  const passwordChanged = searchParams.get('reason') === 'password-changed'

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, tv('emailRequired')).email(tv('emailInvalid')),
        password: z.string().min(1, tv('passwordRequired')),
      }),
    [tv]
  )

  type LoginFormData = z.infer<typeof loginSchema>

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(user?.mustChangePassword ? '/alterar-senha' : '/dashboard')
    }
  }, [isAuthenticated, router, user?.mustChangePassword])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const { mutate, isPending, isError, error } = usePostSessions({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200) {
          signIn(response.data)
          router.push(
            response.data.user.mustChangePassword
              ? '/alterar-senha'
              : '/dashboard'
          )
        }
      },
    },
  })

  function onSubmit(data: LoginFormData) {
    mutate({ data: { email: data.email, password: data.password } })
  }

  return (
    <main className="flex h-full min-h-screen">
      {/* Brand panel (desktop only) */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ematrix-dark p-16 lg:flex">
        <div className="bg-login-gradient pointer-events-none absolute inset-0 opacity-50" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-container opacity-20 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-tertiary-container opacity-10 blur-[100px]" />

        <div className="relative z-10 flex items-center gap-4">
          <Image
            src="/logo.png"
            alt={tc('logoAlt')}
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <h1 className="font-headline text-3xl font-extrabold tracking-[0.2em] text-white">
            E-MATRIX
          </h1>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="mb-6 font-headline text-4xl leading-tight font-semibold text-white">
            {t('tagline')}
          </h2>
          <div className="h-1.5 w-20 rounded-full bg-tertiary-container" />
        </div>

        <div className="relative z-10">
          <Copyright className="text-slate-300" />
        </div>
      </section>

      {/* Login form */}
      <section className="relative flex w-full flex-col items-center justify-center bg-white px-8 py-12 lg:w-1/2 lg:px-20">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher className="text-on-surface-variant" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10 flex flex-col items-center lg:items-start">
            <Image
              src="/logo.png"
              alt={tc('logoAlt')}
              width={64}
              height={64}
              className="mb-6 h-16 w-16 lg:hidden"
            />
            <h2 className="mb-2 font-headline text-3xl font-bold text-on-surface">
              {t('title')}
            </h2>
            <p className="font-body text-outline">{t('subtitle')}</p>
            {sessionExpired && (
              <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
                {t('sessionExpired')}
              </p>
            )}
            {passwordChanged && (
              <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
                {t('passwordChanged')}
              </p>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label
                htmlFor="email"
                className="mb-2 block text-xs font-medium text-on-surface-variant"
              >
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                className={fieldClasses}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-on-surface-variant"
                >
                  {t('password')}
                </Label>
                <Link
                  href="/esqueci-minha-senha"
                  className="font-label text-sm font-semibold text-primary transition-colors hover:text-primary-container"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                className={fieldClasses}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {isError && (
              <p role="alert" className="text-sm text-error">
                {translateError(error)}
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="h-auto w-full rounded-xl bg-primary-container py-4 font-headline text-lg font-bold text-on-primary-container shadow-lg shadow-primary-container/20 hover:brightness-105 active:scale-[0.98]"
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
