import type { ContextualNavTab } from '../context'
import type { DetailPageNavItem } from './detailPageNavItem.interface'

export interface DetailPageNav<T extends ContextualNavTab = ContextualNavTab> {
  name: string
  sourceEmoji: string
  sourceColor: string
  navItems: DetailPageNavItem<T>[]
  tab: T
  onTabChange: (n: T) => void
  backLabel?: string
  backPath?: string
}
