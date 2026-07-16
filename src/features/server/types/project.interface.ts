import type { GeneratedTool } from './generatedTool.interface'
import type { McpResource } from './mcpResource.interface'
import type { McpPrompt } from './mcpPrompt.interface'
import type { ToolChain } from './toolChain.interface'
import type { McpApiKeyEntry } from './mcpApiKeyEntry.interface'
import type { AuthConfig } from './authConfig.type'
import type { OAuthConfig } from './oauthConfig.type'

export interface Project {
  _id: string
  name: string
  baseUrl: string
  description?: string
  tags?: string[]
  version?: string
  shareSlug?: string | null
  status: string
  isPaused?: boolean
  maintenanceMode?: { enabled: boolean; message: string }
  availabilityWindow?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  alertConfig?: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }
  tools: GeneratedTool[]
  resources?: McpResource[]
  prompts?: McpPrompt[]
  chains?: ToolChain[]
  mcpApiKey?: string
  mcpApiKeys?: McpApiKeyEntry[]
  oauthClientId?: string
  oauthClientSecret?: string
  oauthConfig?: OAuthConfig
  rateLimit?: { enabled: boolean; requestsPerMinute: number }
  responseConfig?: {
    enabled: boolean
    maxResponseLen?: number
    maxDepth?: number
    arraySlice?: number
    errorTruncateLen?: number
  }
  auth?: AuthConfig
  createdAt: string
  updatedAt: string
}
