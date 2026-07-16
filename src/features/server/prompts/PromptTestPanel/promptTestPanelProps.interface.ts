import type { GlobalPrompt } from '../../types'

export interface PromptTestPanelProps {
  prompt: GlobalPrompt
  mcpServerIdentifier: string
  anyApiKey?: string
}
