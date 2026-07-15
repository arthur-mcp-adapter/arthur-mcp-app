import type { AiProvider } from '../../features/aiProviders'

export interface OverviewTabProps { provider: AiProvider; onUpdated: (p: AiProvider) => void }
