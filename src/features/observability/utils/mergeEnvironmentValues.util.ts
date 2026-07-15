import { ENVIRONMENT_CONTROLS } from '../environmentControls.constant'
import { defaultEnvironmentValues } from './defaultEnvironmentValues.util'

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
