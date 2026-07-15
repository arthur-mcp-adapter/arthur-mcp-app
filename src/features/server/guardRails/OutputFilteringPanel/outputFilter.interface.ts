import type { FilterType } from './filterType.type'

export interface OutputFilter {
  id: string
  type: FilterType
  target: string
  replacement: string
  toolName: string
  enabled: boolean
}
