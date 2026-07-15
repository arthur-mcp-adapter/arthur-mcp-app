import type { ShareToolParameter } from './shareToolParameter.interface'

export interface ShareTool {
  name: string
  description?: string
  parameters: ShareToolParameter[]
  outputSchema?: Record<string, unknown>
  comments?: Array<{ text: string; author: string; createdAt: string }>
}
