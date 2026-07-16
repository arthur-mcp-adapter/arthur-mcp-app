import type { McpResource } from '../../types'

export interface ResourceTestPanelProps {
  resource: McpResource
  mcpServerIdentifier: string
  anyApiKey?: string
}
