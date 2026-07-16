import type { GeneratedTool } from '../../types'
import type { EndpointRef } from '../../types'

export interface EndpointAccordionProps {
  endpoint: { tool: GeneratedTool } & EndpointRef
  projectId: string
  mcpServerIdentifier: string
  anyApiKey?: string
  canTest: boolean
  onEdit?: () => void
  onToolChanged?: (oldName: string, newTool: GeneratedTool) => void
}
