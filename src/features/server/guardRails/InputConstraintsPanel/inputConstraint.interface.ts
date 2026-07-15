import type { ConstraintType } from './constraintType.type'

export interface InputConstraint {
  id: string
  toolName: string
  paramName: string
  type: ConstraintType
  value: string
  enabled: boolean
}
