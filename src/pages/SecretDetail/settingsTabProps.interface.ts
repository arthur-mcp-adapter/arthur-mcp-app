import type { Secret } from '../../features/secrets'

export interface SettingsTabProps { secret: Secret; onUpdated: (s: Secret) => void }
