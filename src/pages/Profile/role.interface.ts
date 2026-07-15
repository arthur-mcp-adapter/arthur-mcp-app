import type { RolePermissions } from './rolePermissions.interface'

export interface Role {
  _id: string
  id?: string
  name: string
  description?: string
  builtin?: boolean
  permissions: RolePermissions
}
