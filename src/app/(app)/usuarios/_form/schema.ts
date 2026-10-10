import { z } from 'zod'

import { UserRole } from '@/http/api'

export const MIN_PASSWORD_LENGTH = 8

export type Translate = (key: string, values?: Record<string, number>) => string

/**
 * `create` also asks for the initial password; the user must change it on the
 * first sign-in. Editing never touches the password.
 */
export function makeUserSchema(tv: Translate, mode: 'create' | 'edit') {
  return z.object({
    name: z.string().trim().min(1, tv('nameRequired')),
    email: z.string().trim().email(tv('emailInvalid')),
    role: z.enum(
      [UserRole.admin, UserRole.user, UserRole.viewer],
      tv('roleRequired')
    ),
    password:
      mode === 'create'
        ? z
            .string()
            .min(
              MIN_PASSWORD_LENGTH,
              tv('passwordMin', { min: MIN_PASSWORD_LENGTH })
            )
        : z.string().optional(),
  })
}

export type UserFormData = z.infer<ReturnType<typeof makeUserSchema>>

export const userFormDefaultValues: UserFormData = {
  name: '',
  email: '',
  role: UserRole.user,
  password: '',
}
