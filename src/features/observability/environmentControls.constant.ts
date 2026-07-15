import type { EnvironmentControl } from './environmentControl.interface'

export const ENVIRONMENT_CONTROLS: EnvironmentControl[] = [
  { name: 'ENABLE_METRICS', defaultValue: 'true', kind: 'boolean' },
  { name: 'SERVICE_NAME', defaultValue: 'arthur-mcp-adapter', kind: 'text' },
  { name: 'SERVICE_VERSION', defaultValue: '1.0.0', kind: 'text' },
  { name: 'PROMETHEUS_METRICS_PATH', defaultValue: '/metrics', kind: 'text' },
]
