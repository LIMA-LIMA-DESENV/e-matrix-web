import './globals.css'

import type { Metadata } from 'next'
import { Alfa_Slab_One, Inter, Manrope, Roboto } from 'next/font/google'
import { cookies } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'

import { Providers } from '@/components/providers'
import {
  LAYOUT_COOKIE,
  parseLayout,
  parseSidebarCollapsed,
  SIDEBAR_COOKIE,
} from '@/lib/layout-preference'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

// Fonts of the classic layout: not preloaded, so the modern layout, which
// never uses them, does not download them.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  preload: false,
})

const alfaSlabOne = Alfa_Slab_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-alfa-slab',
  preload: false,
})

const fontVariables = [inter, manrope, roboto, alfaSlabOne]
  .map((font) => font.variable)
  .join(' ')

export const metadata: Metadata = {
  title: 'E-Matrix',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  // Read on the server so the first frame already has the chosen layout.
  const cookieStore = await cookies()
  const layout = parseLayout(cookieStore.get(LAYOUT_COOKIE)?.value)
  const isSidebarCollapsed = parseSidebarCollapsed(
    cookieStore.get(SIDEBAR_COOKIE)?.value
  )

  return (
    <html
      lang={locale}
      className={fontVariables}
      data-layout={layout === 'classic' ? 'classic' : undefined}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-surface font-body text-on-surface antialiased">
        <NextIntlClientProvider>
          <Providers
            initialLayout={layout}
            initialSidebarCollapsed={isSidebarCollapsed}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
