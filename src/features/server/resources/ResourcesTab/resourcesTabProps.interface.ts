import type { McpResource } from '../../types'
import type { GeneratedTool } from '../../types'

export interface ResourcesTabProps {
  projectId: string
  initialResources: McpResource[]
  tools: GeneratedTool[]
  onChange: (resources: McpResource[]) => void
  anyApiKey?: string
}
