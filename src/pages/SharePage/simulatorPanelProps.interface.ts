import type { AuthMode } from './authMode.type'
import type { ShareToolParameter } from './shareToolParameter.interface'

export interface SimulatorPanelProps {
  authKey: string
  authMode: AuthMode
  authRequired: boolean
  buildPayload: (values: Record<string, string>) => Record<string, unknown>
  fields?: ShareToolParameter[]
  mcpUrl: string
}
