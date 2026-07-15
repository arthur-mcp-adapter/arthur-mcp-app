import type { McpPrompt } from '../../types'

export interface PromptsTabProps {
  projectId: string
  initialPrompts: McpPrompt[]
  onChange: (prompts: McpPrompt[]) => void
  anyApiKey?: string
}
