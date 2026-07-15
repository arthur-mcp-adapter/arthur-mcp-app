import type { ObservabilityProvider } from '../../features/observability'

export interface SettingsTabProps { provider: ObservabilityProvider; onUpdated: (p: ObservabilityProvider) => void }
