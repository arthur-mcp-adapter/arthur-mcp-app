export interface McpEndpointBarProps {
  projectId: string
  hasKeys: boolean
  shareSlug?: string | null
  onShareSlugChange?: (shareSlug: string) => void
}
