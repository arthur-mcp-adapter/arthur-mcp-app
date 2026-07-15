import type { ObservabilityProvider } from '../types'

export interface ObservabilityProviderCardProps {
  provider: ObservabilityProvider
  onEdit: (provider: ObservabilityProvider) => void
  onDelete: (provider: ObservabilityProvider) => void
}
