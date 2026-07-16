import type { GeneratedTool } from './generatedTool.interface'
import type { DocsResource } from './docsResource.interface'

export interface DocsProject {
  _id: string
  name: string
  baseUrl: string
  description?: string
  version?: string
  shareSlug?: string | null
  status: string
  tools: GeneratedTool[]
  mcpApiKey?: string
  resources?: DocsResource[]
  prompts?: Array<{ promptId: string; enabled?: boolean }>
}
