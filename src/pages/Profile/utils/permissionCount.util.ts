import type { RolePermissions } from '../rolePermissions.interface'

export function permissionCount(permissions: RolePermissions): number {
  return Object.values(permissions).filter(Boolean).length
}
