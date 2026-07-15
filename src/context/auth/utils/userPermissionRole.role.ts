import { READ_ONLY_FALLBACK } from '../readOnlyFallback.constant'
import { ROLE_PERMISSION_FALLBACKS } from '../rolePermissionFallbacks.constant'
import type { UserPermissions } from '../userPermissions.interface'

export function userPermissionRole(role: string): UserPermissions {
  return ROLE_PERMISSION_FALLBACKS[role] ?? READ_ONLY_FALLBACK
}
