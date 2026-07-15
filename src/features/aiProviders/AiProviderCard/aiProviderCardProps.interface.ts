import type { AiProvider } from '../types'

export interface AiProviderCardProps {
  provider: AiProvider
  onEdit: (provider: AiProvider) => void
  onDelete: (provider: AiProvider) => void
}
