import type { HookPhase } from './hookPhase.type'
import type { HookType } from './hookType.type'

export interface ExecutionHook {
  id: string
  phase: HookPhase
  type: HookType
  key: string
  value: string
  enabled: boolean
}
