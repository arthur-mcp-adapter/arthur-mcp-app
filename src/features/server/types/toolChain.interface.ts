import type { JsonSchema } from './jsonSchema.interface'
import type { ChainStep } from './chainStep.interface'

export interface ToolChain {
  id: string
  name: string
  description?: string
  inputSchema: JsonSchema
  steps: ChainStep[]
  enabled?: boolean
}
