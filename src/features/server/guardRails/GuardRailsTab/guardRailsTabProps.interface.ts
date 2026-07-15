import type { GeneratedTool } from '../../types'
import type { AuthConfig } from '../../types'

export interface GuardRailsTabProps {
  projectId: string
  tools: GeneratedTool[]
  initialAuth?: AuthConfig
  onAuthChange: (auth: AuthConfig) => void
}
