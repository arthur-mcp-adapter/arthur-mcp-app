import type { UserPermissions } from './userPermissions.interface'

export interface Me {
  _id: string
  username: string
  email: string
  role: string
  permissions?: UserPermissions
}
