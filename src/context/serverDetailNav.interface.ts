import type { ServerNavItem } from './serverNavItem.interface'
import type { ContextualNavTab } from './contextualNavTab.type'

export interface ServerDetailNav {
  name: string
  sourceEmoji: string
  sourceColor: string
  navItems: ServerNavItem[]
  tab: ContextualNavTab
  onTabChange: (n: ContextualNavTab) => void
  backLabel?: string
  backPath?: string
}
