export type NavKey =
  | 'dashboard'
  | 'managementPlan'
  | 'programs'
  | 'documents'
  | 'projects'
  | 'trainings'
  | 'meetings'
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
