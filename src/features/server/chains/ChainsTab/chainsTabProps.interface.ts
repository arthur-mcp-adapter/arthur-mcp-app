import type { ToolChain } from '../../types'
import type { GeneratedTool } from '../../types'

export interface ChainsTabProps {
  projectId: string
  initialChains: ToolChain[]
  tools: GeneratedTool[]
  onChange: (chains: ToolChain[]) => void
}
