import type { RestrictionType } from './restrictionType.type'

export interface ToolRestriction {
  id: string
  toolName: string
  type: RestrictionType
  limit: number
  enabled: boolean
}
