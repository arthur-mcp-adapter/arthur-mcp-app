import type { ChainInputMapping } from './chainInputMapping.interface'

export interface ChainStep {
  id: string
  toolName: string
  inputMapping: ChainInputMapping[]
}
