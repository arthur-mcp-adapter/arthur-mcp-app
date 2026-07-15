import type { EnvironmentControlKind } from './environmentControlKind.type'

export interface EnvironmentControl {
  name: string
  defaultValue: string
  kind: EnvironmentControlKind
  options?: string[]
}
