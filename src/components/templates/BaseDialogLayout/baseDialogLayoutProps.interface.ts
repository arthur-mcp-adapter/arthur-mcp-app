import type { ReactNode } from 'react'

export interface BaseDialogLayoutProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  titleIcon?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  anchor?: 'left' | 'right'
  width?: number
}
