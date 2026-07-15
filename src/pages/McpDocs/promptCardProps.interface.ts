import type { GlobalPrompt } from './globalPrompt.interface'

export interface PromptCardProps { prompt: GlobalPrompt; projectId: string; mcpApiKey?: string }
