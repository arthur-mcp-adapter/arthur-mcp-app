export type ErrorTrackingToolType = 'sentry' | 'rollbar' | 'bugsnag' | 'datadog_apm' | 'newrelic_apm' | 'custom'

export interface ErrorTrackingProvider {
  id: string
  name: string
  description?: string
  tool: ErrorTrackingToolType
  dsn: string
  projectName?: string
  environment?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TestConnectionResult {
  ok: boolean
  latencyMs: number
  error?: string
}
