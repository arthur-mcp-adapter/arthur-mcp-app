import type { ReactNode } from 'react'
import type { OperationTone } from './operationTone.type'

export interface DocAccordionProps {
  title: string
  subtitle?: string
  chips?: React.ReactNode
  tone?: OperationTone
  children: ReactNode
}
