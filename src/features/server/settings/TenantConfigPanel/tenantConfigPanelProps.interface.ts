import type { TenantParam } from '../../types'

export interface TenantConfigPanelProps {
  projectId: string
  initialConfig?: { enabled: boolean; params: TenantParam[] }
  toolParamSuggestions: string[]
}
