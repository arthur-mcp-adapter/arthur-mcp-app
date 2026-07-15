import type { ToolChain } from '../../types'
import type { GeneratedTool } from '../../types'

export interface ChainDialogProps {
  open: boolean
  editTarget: ToolChain | null
  tools: GeneratedTool[]
  onClose: () => void
  onSaved: (chain: ToolChain) => void
}
