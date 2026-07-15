export interface OAuthClientPanelProps {
  projectId: string
  initialClientId?: string
  initialClientSecret?: string
  serverBase: string
  onChange: (clientId: string | null, clientSecret: string | null) => void
}
