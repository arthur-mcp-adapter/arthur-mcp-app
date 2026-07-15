import type { ReactNode } from 'react'
import type { ContextualNavTab } from './contextualNavTab.type'

export interface ServerNavItem {
  label: string
  icon: ReactNode
  idx: ContextualNavTab
  badge?: number
  disabled?: boolean
}
