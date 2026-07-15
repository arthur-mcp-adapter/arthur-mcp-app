import type { ReactNode } from 'react'

export interface BaseListCardAction {
  icon: ReactNode
  tooltip: string
  onClick: (e: React.MouseEvent) => void
  color?: 'default' | 'success' | 'error' | 'inherit'
  disabled?: boolean
}
