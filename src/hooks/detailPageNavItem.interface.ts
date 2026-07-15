import type { ContextualNavTab } from '../context'
import type { ReactNode } from 'react'

export interface DetailPageNavItem<T extends ContextualNavTab = ContextualNavTab> {
  label: string
  icon: ReactNode
  idx: T
  badge?: number
  disabled?: boolean
}
