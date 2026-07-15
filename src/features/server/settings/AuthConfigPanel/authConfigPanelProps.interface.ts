import type { AuthConfig } from '../../types'

export interface AuthConfigPanelProps {
  projectId: string
  initialAuth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}
