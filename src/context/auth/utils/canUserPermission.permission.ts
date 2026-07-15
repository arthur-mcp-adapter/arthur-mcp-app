import type { Me } from '../me.interface'
import type { UserPermissions } from '../userPermissions.interface'
import { userPermissionRole } from './userPermissionRole.role'

export function canUserPermission(me: Me | null, key: keyof UserPermissions): boolean {
  if (!me) return false
  if (me.role === 'admin') return true
  const permissions = me.permissions ?? userPermissionRole(me.role)
  return permissions[key] ?? false
}
