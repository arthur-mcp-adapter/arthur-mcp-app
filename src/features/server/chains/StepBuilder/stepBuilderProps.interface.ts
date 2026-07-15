import type { ChainStep } from '../../types'
import type { GeneratedTool } from '../../types'

export interface StepBuilderProps {
  step: ChainStep
  index: number
  total: number
  tools: GeneratedTool[]
  previousSteps: ChainStep[]
  onChange: (s: ChainStep) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}
