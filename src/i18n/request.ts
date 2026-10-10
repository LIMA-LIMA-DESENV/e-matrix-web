import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config'

/**
 * Picks the first supported language of the Accept-Language header, matching
 * on the primary subtag too ("es-AR" -> "es", "pt" -> "pt-BR").
 */
function negotiateLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null

  const requested = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())

  for (const tag of requested) {
    if (tag === 'pt-br' || tag === 'pt') return 'pt-BR'
    const primary = tag.split('-')[0]
    if (isLocale(primary)) return primary
  }

  return null
}

// The locale is not part of the URL (unlike the legacy /pt_BR/... routes):
// it comes from the user's choice stored in a cookie, then from the browser.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (negotiateLocale((await headers()).get('accept-language')) ??
      defaultLocale)

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
