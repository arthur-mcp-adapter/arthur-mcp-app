import type { McpApiKeyEntry } from '../../types'

export interface ApiKeysPanelProps {
  projectId: string
  initialKeys: McpApiKeyEntry[]
  onChange: (keys: McpApiKeyEntry[]) => void
}
