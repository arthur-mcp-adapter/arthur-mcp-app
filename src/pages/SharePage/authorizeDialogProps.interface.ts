import type { AuthMode } from './authMode.type'

export interface AuthorizeDialogProps {
  authKey: string
  authMode: AuthMode
  hasApiKey: boolean
  hasOAuthClient: boolean
  mcpUrl: string
  onAuthorize: (value: string, mode: AuthMode) => void
  onClear: () => void
  onClose: () => void
  onModeChange: (mode: AuthMode) => void
  open: boolean
}
