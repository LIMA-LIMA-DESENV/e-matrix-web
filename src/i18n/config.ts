export const locales = ['pt-BR', 'en', 'es'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'pt-BR'

/** Cookie read by `request.ts` and written by the language switcher. */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeLabels: Record<Locale, string> = {
  'pt-BR': 'Português (BR)',
  en: 'English',
  es: 'Español',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale)
}
