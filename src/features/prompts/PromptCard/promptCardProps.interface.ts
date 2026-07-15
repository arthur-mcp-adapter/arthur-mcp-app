import type { Prompt } from '../types'

export interface PromptCardProps {
  prompt: Prompt
  onEdit: (prompt: Prompt) => void
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  canEdit: boolean
  canDelete: boolean
  copied: boolean
}
