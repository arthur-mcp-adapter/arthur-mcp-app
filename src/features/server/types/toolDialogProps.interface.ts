import type { GeneratedTool } from './generatedTool.interface'

export interface ToolDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool, oldName?: string) => void
  onDeleted?: (toolName: string) => void
  projectId: string
  projectBaseUrl: string
  editTool?: GeneratedTool
  prefillFrom?: GeneratedTool
  mode?: 'tool' | 'endpoint'
  allTools?: GeneratedTool[]
}
