import type { ErrorTrackingProvider } from '../types'

export interface ErrorTrackingProviderCardProps {
  provider: ErrorTrackingProvider
  onEdit: (provider: ErrorTrackingProvider) => void
  onDelete: (provider: ErrorTrackingProvider) => void
}
