import type { UserPermissions } from '../../../context/auth'

export type NavItem = {
  titleKey: string
  icon: React.ElementType
  path: string
  permission?: keyof UserPermissions
  adminOnly?: boolean
  wip?: boolean
}
