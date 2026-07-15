import type { Prompt } from '../../features/prompts'

export interface SettingsTabProps {
  prompt: Prompt
  onUpdated: (p: Prompt) => void
}
