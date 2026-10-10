'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ListSort, SortDirection } from './list-utils'

/**
 * Declares which URL params a list screen accepts. Define it at module scope
 * so its identity is stable across renders.
 */
export interface ListStateConfig<S extends string, F extends string = never> {
  sortKeys: readonly S[]
  defaultSort: ListSort<S>
  /**
   * Filter key → accepted values, or a validator for dynamic values (e.g.
   * record ids). The empty value means "no filter".
   */
  filters?: Record<F, readonly string[] | ((value: string) => boolean)>
}

export interface ListUrlState<S extends string, F extends string = never> {
  q: string
  sort: S
  dir: SortDirection
  /** Requested page (≥ 1). `paginate` clamps it to the last valid page. */
  page: number
  filters: Record<F, string>
}

interface SearchParamsReader {
  get(name: string): string | null
}

function filterKeys<S extends string, F extends string>(
  config: ListStateConfig<S, F>
) {
  return Object.keys(config.filters ?? {}) as F[]
}

function isAcceptedFilterValue<S extends string, F extends string>(
  config: ListStateConfig<S, F>,
  key: F,
  value: string
) {
  const accepted = config.filters?.[key]
  if (!accepted || !value) return false

  return typeof accepted === 'function'
    ? accepted(value)
    : accepted.includes(value)
}

/**
 * Reads the list state from URL params. Missing, unknown or invalid values
 * fall back to the defaults.
 */
export function parseListState<S extends string, F extends string = never>(
  params: SearchParamsReader,
  config: ListStateConfig<S, F>
): ListUrlState<S, F> {
  const sortParam = params.get('sort')
  const dirParam = params.get('dir')
  const pageParam = params.get('page') ?? ''
  const page = /^\d+$/.test(pageParam) ? Number(pageParam) : 1

  const filters = {} as Record<F, string>
  for (const key of filterKeys(config)) {
    const value = params.get(key) ?? ''
    filters[key] = isAcceptedFilterValue(config, key, value) ? value : ''
  }

  return {
    q: params.get('q') ?? '',
    sort: config.sortKeys.includes(sortParam as S)
      ? (sortParam as S)
      : config.defaultSort.key,
    dir:
      dirParam === 'asc' || dirParam === 'desc'
        ? dirParam
        : config.defaultSort.dir,
    page: page >= 1 ? page : 1,
    filters,
  }
}

/**
 * Serializes the list state, omitting defaults and empty values.
 */
export function serializeListState<S extends string, F extends string = never>(
  state: ListUrlState<S, F>,
  config: ListStateConfig<S, F>
) {
  const params = new URLSearchParams()

  if (state.q.trim()) params.set('q', state.q)

  for (const key of filterKeys(config)) {
    if (state.filters[key]) params.set(key, state.filters[key])
  }

  if (
    state.sort !== config.defaultSort.key ||
    state.dir !== config.defaultSort.dir
  ) {
    params.set('sort', state.sort)
    params.set('dir', state.dir)
  }

  if (state.page > 1) params.set('page', String(state.page))

  return params.toString()
}

/**
 * List state (search, filters, sort and page) kept in the URL, so it survives
 * going to a record and back, reloading and sharing the link.
 *
 * Writes use `router.replace` (no history entry per keystroke). Changing the
 * search, a filter or the sort goes back to page 1.
 */
export function useListState<S extends string, F extends string = never>(
  config: ListStateConfig<S, F>
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlState = useMemo(
    () => parseListState(searchParams, config),
    [searchParams, config]
  )

  // The input follows local state so typing never waits for the URL. URL
  // values we wrote ourselves are skipped; anything else (a link, the
  // sidebar) is adopted.
  const [search, setSearchValue] = useState(urlState.q)
  const pendingSearches = useRef<string[]>([])

  useEffect(() => {
    const pending = pendingSearches.current
    const index = pending.indexOf(urlState.q)

    if (index >= 0) {
      pending.splice(0, index + 1)
      return
    }

    setSearchValue(urlState.q)
  }, [urlState.q])

  const state = useMemo<ListUrlState<S, F>>(
    () => ({ ...urlState, q: search }),
    [urlState, search]
  )

  const replaceState = useCallback(
    (next: ListUrlState<S, F>) => {
      const nextQuery = next.q.trim() ? next.q : ''
      if (nextQuery !== urlState.q) pendingSearches.current.push(nextQuery)

      const query = serializeListState(next, config)
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [config, pathname, router, urlState.q]
  )

  const setSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      replaceState({ ...state, q: value, page: 1 })
    },
    [replaceState, state]
  )

  const setFilter = useCallback(
    (key: F, value: string) => {
      replaceState({
        ...state,
        filters: { ...state.filters, [key]: value },
        page: 1,
      })
    },
    [replaceState, state]
  )

  const toggleSort = useCallback(
    (key: S) => {
      const dir: SortDirection =
        state.sort === key && state.dir === 'asc' ? 'desc' : 'asc'

      replaceState({ ...state, sort: key, dir, page: 1 })
    },
    [replaceState, state]
  )

  const setPage = useCallback(
    (page: number) => {
      replaceState({ ...state, page: Math.max(1, page) })
    },
    [replaceState, state]
  )

  const clearFilters = useCallback(() => {
    const filters = {} as Record<F, string>
    for (const key of filterKeys(config)) filters[key] = ''

    setSearchValue('')
    replaceState({ ...state, q: '', filters, page: 1 })
  }, [config, replaceState, state])

  const sortState = useMemo<ListSort<S>>(
    () => ({ key: state.sort, dir: state.dir }),
    [state.sort, state.dir]
  )

  const hasActiveFilters =
    Boolean(state.q.trim()) ||
    filterKeys(config).some((key) => Boolean(state.filters[key]))

  return {
    ...state,
    sortState,
    hasActiveFilters,
    setSearch,
    setFilter,
    toggleSort,
    setPage,
    clearFilters,
  }
}
