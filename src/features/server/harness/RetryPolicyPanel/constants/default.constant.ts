import type { RetryPolicy } from '../retryPolicy.interface'

export const DEFAULT: RetryPolicy = {
  enabled: false,
  maxRetries: 3,
  backoffStrategy: 'exponential',
  initialDelayMs: 500,
  retryOnCodes: [429, 500, 502, 503, 504],
}
