import { useTranslations } from 'next-intl'

import { UserRole, type UserRole as UserRoleType } from '@/http/api'
import { cn } from '@/lib/utils'

const roles: Array<{ value: UserRoleType; icon: string }> = [
  { value: UserRole.admin, icon: 'shield_person' },
  { value: UserRole.user, icon: 'edit_note' },
  { value: UserRole.viewer, icon: 'visibility' },
]

interface RoleSelectorProps {
  value: UserRoleType
  onChange: (role: UserRoleType) => void
  disabled?: boolean
  /** Roles that cannot be picked, e.g. an admin demoting themselves. */
  disabledRoles?: UserRoleType[]
}

/** Radio cards for the single, hierarchical user role. */
export function RoleSelector({
  value,
  onChange,
  disabled,
  disabledRoles = [],
}: RoleSelectorProps) {
  const t = useTranslations('roles')

  return (
    <div role="radiogroup" className="grid gap-3 md:grid-cols-3">
      {roles.map((role) => {
        const checked = value === role.value
        const isDisabled = disabled || disabledRoles.includes(role.value)

        return (
          <label
            key={role.value}
            className={cn(
              'flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition-colors',
              checked
                ? 'border-primary-container bg-primary-fixed/30'
                : 'border-outline-variant/40 bg-surface-container-low hover:border-outline-variant',
              isDisabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={checked}
              disabled={isDisabled}
              onChange={() => onChange(role.value)}
              className="sr-only"
            />
            <span className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <span
                className={cn(
                  'material-symbols-outlined text-xl',
                  checked ? 'text-primary' : 'text-outline'
                )}
                aria-hidden
              >
                {role.icon}
              </span>
              {t(role.value)}
            </span>
            <span className="text-xs text-on-surface-variant">
              {t(`${role.value}Description`)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
