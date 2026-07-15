import type { AiProvider } from '../../features/aiProviders'

export interface SettingsTabProps { provider: AiProvider; onUpdated: (p: AiProvider) => void }
