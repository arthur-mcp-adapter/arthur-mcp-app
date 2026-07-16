import type { OAuthConfig } from '../../types'

export interface OAuthClientPanelProps {
  projectId: string
  shareSlug?: string | null
  initialClientId?: string
  initialClientSecret?: string
  initialConfig?: OAuthConfig
  serverBase: string
  onChange: (clientId: string | null, clientSecret: string | null, config: OAuthConfig) => void
}
