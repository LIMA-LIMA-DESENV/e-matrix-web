export type NavKey =
  | 'dashboard'
  | 'managementPlan'
  | 'programs'
  | 'documents'
  | 'projects'
  | 'trainings'
  | 'meetings'
  | 'evaluations'
  | 'matrix'
  | 'users'
  | 'parameters'

export interface NavItem {
  key: NavKey
  href: string
  icon: string
  adminOnly?: boolean
  /** Legacy module not migrated yet: shown, but not navigable. */
  pending?: boolean
  /**
   * Optional module shown only when the API enables at least one evaluation
   * type (`GET /evaluations/types`), never by a `NEXT_PUBLIC_*` variable.
   */
  requiresEvaluationTypes?: boolean
}

// Same order as the legacy sidebar; administration items come from the legacy
// header "Administração" menu.
export const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'dashboard' },
  { key: 'managementPlan', href: '/plano-de-gestao', icon: 'monitoring' },
  { key: 'programs', href: '/programa', icon: 'diamond' },
  { key: 'documents', href: '/documentos', icon: 'description' },
  { key: 'projects', href: '/projetos', icon: 'list_alt' },
  { key: 'trainings', href: '/treinamentos', icon: 'directions_bike' },
  { key: 'meetings', href: '/reunioes', icon: 'calendar_month' },
  {
    key: 'evaluations',
    href: '/avaliacoes',
    icon: 'assignment',
    requiresEvaluationTypes: true,
  },
  { key: 'matrix', href: '/matriz', icon: 'grid_on' },
]

export const adminItems: NavItem[] = [
  {
    key: 'users',
    href: '/usuarios',
    icon: 'manage_accounts',
    adminOnly: true,
  },
  {
    key: 'parameters',
    href: '/parametros',
    icon: 'tune',
    adminOnly: true,
  },
]
