import type { ShareTool } from './shareTool.interface'
import type { ShareResource } from './shareResource.interface'
import type { SharePrompt } from './sharePrompt.interface'

export interface ShareInfo {
  name: string
  description?: string
  version?: string
  status: string
  mcpUrl: string
  shareSlug?: string | null
  hasKey: boolean
  hasOAuthClient?: boolean
  toolCount: number
  resourceCount: number
  promptCount: number
  tools: ShareTool[]
  resources: ShareResource[]
  prompts: SharePrompt[]
}
