import type { NavItem } from './navItem.type'

export type NavSection = {
  subheaderKey: string
  items: NavItem[]
  selfHostedOnly?: boolean
}
