import { ENVIRONMENT_CONTROLS } from '../environmentControls.constant'

export function defaultEnvironmentValues(): Record<string, string> {
  return Object.fromEntries(ENVIRONMENT_CONTROLS.map((control) => [control.name, control.defaultValue]))
}
