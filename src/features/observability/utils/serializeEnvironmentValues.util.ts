import { ENVIRONMENT_CONTROLS } from '../environmentControls.constant'
import { formatEnvironmentValue } from './formatEnvironmentValue.util'

export function serializeEnvironmentValues(values: Record<string, string>): string {
  return ENVIRONMENT_CONTROLS.map(
    (control) => `${control.name}=${formatEnvironmentValue(values[control.name] ?? '')}`,
  ).join('\n')
}
