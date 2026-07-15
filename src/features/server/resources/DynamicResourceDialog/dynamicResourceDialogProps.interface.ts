import type { GeneratedTool } from '../../types'
import type { McpResource } from '../../types'

export interface DynamicResourceDialogProps {
  open: boolean
  projectId: string
  tools: GeneratedTool[]
  onSave: (resource: McpResource) => void
  onClose: () => void
  prefillTool?: GeneratedTool
}
