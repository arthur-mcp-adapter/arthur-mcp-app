export type EnvironmentControlKind = 'boolean' | 'select' | 'text'

export interface EnvironmentControl {
  name: string
  defaultValue: string
  kind: EnvironmentControlKind
  options?: string[]
}

export const ENVIRONMENT_CONTROLS: EnvironmentControl[] = [
  { name: 'ENABLE_METRICS', defaultValue: 'true', kind: 'boolean' },
  { name: 'SERVICE_NAME', defaultValue: 'arthur-mcp-adapter', kind: 'text' },
  { name: 'SERVICE_VERSION', defaultValue: '1.0.0', kind: 'text' },
  { name: 'PROMETHEUS_METRICS_PATH', defaultValue: '/metrics', kind: 'text' },
]

export function defaultEnvironmentValues(): Record<string, string> {
  return Object.fromEntries(ENVIRONMENT_CONTROLS.map((control) => [control.name, control.defaultValue]))
}

export function mergeEnvironmentValues(values?: Record<string, string>): Record<string, string> {
  const defaults = defaultEnvironmentValues()
  if (!values) return defaults
  return {
    ...defaults,
    ...Object.fromEntries(
      ENVIRONMENT_CONTROLS.map((control) => [control.name, String(values[control.name] ?? defaults[control.name])]),
    ),
  }
}

export function formatEnvironmentValue(value: string): string {
  return value === '' ? '""' : value
}

export function serializeEnvironmentValues(values: Record<string, string>): string {
  return ENVIRONMENT_CONTROLS.map(
    (control) => `${control.name}=${formatEnvironmentValue(values[control.name] ?? '')}`,
  ).join('\n')
}
