import { useMemo } from 'react'

import { ALL_PERIODS } from '@/components/list'
import {
  type ImprovementProject,
  ImprovementProjectScope,
  useGetImprovementProjects,
} from '@/http/api'

/** One RGP or RGA of an activity, as the row menu lists it (J7). */
export interface MatrixProjectLink {
  id: string
  code: string
  href: string
}

/**
 * The tab of Projetos that lists the project, searching for its code in every
 * period (D-9, H-4). The search by `RGP-3` also finds `RGP-30`; the record is
 * there, maybe not alone.
 */
function projectHref(project: ImprovementProject) {
  const params = new URLSearchParams({ period: ALL_PERIODS })

  if (project.scope === ImprovementProjectScope.production) {
    params.set('q', project.code)
    return `/projetos/producao?${params}`
  }

  params.set('type', 'rga')
  params.set('q', project.code)
  return `/projetos/escritorio?${params}`
}

const SCOPE_ORDER: Record<ImprovementProjectScope, number> = {
  production: 0,
  office: 1,
}

/**
 * The RGP and RGA of every activity, from a single `GET /improvement-projects`
 * with no parameter, loaded with the screen (FR-026, RK-5): grouped by
 * activity, the RGP before the RGA and each by number. A failure here only
 * reaches the row menus, never the table.
 */
export function useMatrixProjects() {
  const query = useGetImprovementProjects()

  const byActivity = useMemo(() => {
    const groups = new Map<string, MatrixProjectLink[]>()

    if (query.data?.status !== 200) return groups

    const sorted = [...query.data.data].sort(
      (a, b) =>
        SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || a.number - b.number
    )

    for (const project of sorted) {
      const links = groups.get(project.activity.id) ?? []
      links.push({
        id: project.id,
        code: project.code,
        href: projectHref(project),
      })
      groups.set(project.activity.id, links)
    }

    return groups
  }, [query.data])

  // Projects already loaded stay listed if a later refetch fails; with none,
  // a retry shows the loading state again instead of the old error.
  const hasData = query.data?.status === 200

  return {
    byActivity,
    isLoading: !hasData && query.isFetching,
    isError: !hasData && !query.isFetching && query.isError,
    refetch: query.refetch,
  }
}

export type MatrixProjects = ReturnType<typeof useMatrixProjects>
