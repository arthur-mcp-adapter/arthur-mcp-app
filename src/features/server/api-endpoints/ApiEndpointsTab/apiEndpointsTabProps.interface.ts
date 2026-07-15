import type { GeneratedTool } from '../../types'

export interface ApiEndpointsTabProps {
  tools: GeneratedTool[]
  projectId: string
  projectBaseUrl: string
  anyApiKey?: string
  onToolAdded: (tool: GeneratedTool) => void
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}
