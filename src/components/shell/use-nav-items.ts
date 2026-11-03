'use client'

import { navItems } from '@/components/shell/nav-items'
import { useEvaluationTypes } from '@/lib/evaluation-types'

/**
 * The sidebar items this installation shows: Avaliações only when the API
 * enables at least one evaluation type, hidden while that is loading or when
 * it fails (FR-010).
 */
export function useVisibleNavItems() {
  const { types } = useEvaluationTypes()
  const hasEvaluationTypes = types.length > 0

  return navItems.filter(
    (item) => !item.requiresEvaluationTypes || hasEvaluationTypes
  )
}
