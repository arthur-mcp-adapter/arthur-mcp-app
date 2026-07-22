import type { UserPermissions } from '../../../context/auth'

export type NavItem = {
  titleKey: string
  icon: React.ElementType
  path: string
  permission?: keyof UserPermissions
  adminOnly?: boolean
  wip?: boolean
  /** External link, opened in a new tab instead of an in-app route. `path` is ignored when set; the URL is picked by the app's current locale. */
  externalUrl?: { en: string; ptBR: string }
}
