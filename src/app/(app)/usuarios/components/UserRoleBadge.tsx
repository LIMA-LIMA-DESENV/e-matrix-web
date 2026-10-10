import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui'
import { UserRole, type UserRole as UserRoleType } from '@/http/api'

const roleStyle: Record<
  UserRoleType,
  { color: 'primary' | 'secondary' | 'outline'; icon: string }
> = {
  [UserRole.admin]: { color: 'primary', icon: 'shield_person' },
  [UserRole.user]: { color: 'secondary', icon: 'edit_note' },
  [UserRole.viewer]: { color: 'outline', icon: 'visibility' },
}

export function UserRoleBadge({ role }: { role: UserRoleType }) {
  const t = useTranslations('roles')
  const style = roleStyle[role]

  return (
    <Badge color={style.color}>
      <span className="material-symbols-outlined text-sm" aria-hidden>
        {style.icon}
      </span>
      {t(role)}
    </Badge>
  )
}
