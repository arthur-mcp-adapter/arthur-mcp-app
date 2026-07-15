import type { ErrorTrackingProvider } from '../../features/errorTracking'

export interface SettingsTabProps { provider: ErrorTrackingProvider; onUpdated: (p: ErrorTrackingProvider) => void }
