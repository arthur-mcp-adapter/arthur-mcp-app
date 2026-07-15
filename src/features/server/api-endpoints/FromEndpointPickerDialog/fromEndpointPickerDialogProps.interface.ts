import type { GeneratedTool } from '../../types'

export interface FromEndpointPickerDialogProps {
  open: boolean
  tools: GeneratedTool[]
  onPick: (tool: GeneratedTool) => void
  onClose: () => void
  onBlank?: () => void
  title?: string
  description?: string
}
