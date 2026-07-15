import type { GeneratedTool } from '../../types'

export interface HarnessTabProps {
  projectId: string
  tools: GeneratedTool[]
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onRateLimitChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}
