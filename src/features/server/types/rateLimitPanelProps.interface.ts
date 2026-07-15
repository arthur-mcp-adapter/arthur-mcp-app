export interface RateLimitPanelProps {
  projectId: string
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}
