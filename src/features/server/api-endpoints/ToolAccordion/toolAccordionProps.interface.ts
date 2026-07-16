import type { GeneratedTool } from '../../types'

export interface ToolAccordionProps {
  tool: GeneratedTool
  projectId: string
  mcpServerIdentifier: string
  anyApiKey?: string
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onEditEndpoint: (tool: GeneratedTool) => void
}
