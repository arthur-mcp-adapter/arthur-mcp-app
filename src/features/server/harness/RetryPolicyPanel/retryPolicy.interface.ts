export interface RetryPolicy {
  enabled: boolean
  maxRetries: number
  backoffStrategy: 'fixed' | 'exponential' | 'linear'
  initialDelayMs: number
  retryOnCodes: number[]
}
