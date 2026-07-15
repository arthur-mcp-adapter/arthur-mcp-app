import type { ReactNode } from 'react'
import type { BaseListCardAction } from './baseListCardAction.interface'

export interface BaseListCardProps {
  icon: ReactNode
  title: string
  description?: string
  content?: ReactNode // e.g., tags, status chips, revealed secret, etc.
  footer?: ReactNode // e.g., metadata line, updated date
  actions: BaseListCardAction[]
  onClick?: () => void
  disabled?: boolean
  opacity?: number // 0-1, for disabled/paused state
}
