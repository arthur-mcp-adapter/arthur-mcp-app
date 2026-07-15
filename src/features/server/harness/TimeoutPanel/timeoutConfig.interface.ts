import type { ToolTimeout } from './toolTimeout.interface'

export interface TimeoutConfig {
  globalTimeoutMs: number
  overrides: ToolTimeout[]
}
