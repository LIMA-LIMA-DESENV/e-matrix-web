import Cookies from 'js-cookie'

export const layouts = ['modern', 'classic'] as const

export type Layout = (typeof layouts)[number]

export const defaultLayout: Layout = 'modern'

/** Cookie read by the root layout and written by the layout switcher. */
export const LAYOUT_COOKIE = 'EMATRIX_LAYOUT'

/** Cookie with the collapsed state of the classic sidebar. */
export const SIDEBAR_COOKIE = 'EMATRIX_SIDEBAR'

const cookieAttributes: Cookies.CookieAttributes = {
  expires: 365,
  path: '/',
  sameSite: 'lax',
}

/** Any missing or unknown value is the default layout. */
export function parseLayout(value: unknown): Layout {
  return value === 'classic' ? 'classic' : defaultLayout
}

/** Only `collapsed` collapses; any other value keeps the sidebar expanded. */
export function parseSidebarCollapsed(value: unknown): boolean {
  return value === 'collapsed'
}

/**
 * Applies the layout to the current page (the `data-layout` attribute the
 * classic tokens hang on) and stores it for the next requests. A blocked
 * cookie only means the choice lasts until the page is reloaded.
 */
export function storeLayout(layout: Layout) {
  const root = document.documentElement
  if (layout === 'classic') {
    root.dataset.layout = 'classic'
  } else {
    delete root.dataset.layout
  }
  Cookies.set(LAYOUT_COOKIE, layout, cookieAttributes)
}

export function storeSidebarCollapsed(collapsed: boolean) {
  Cookies.set(
    SIDEBAR_COOKIE,
    collapsed ? 'collapsed' : 'expanded',
    cookieAttributes
  )
}
