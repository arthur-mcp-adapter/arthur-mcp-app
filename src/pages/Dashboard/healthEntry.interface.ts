export interface HealthEntry {
  projectId: string
  serverName: string
  isPaused: boolean
  errorRatePct: number
  totalCalls: number
}
