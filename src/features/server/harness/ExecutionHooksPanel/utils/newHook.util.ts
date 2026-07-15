import type { ExecutionHook } from '../executionHook.interface'

export function newHook(): ExecutionHook {
  return { id: crypto.randomUUID(), phase: 'before', type: 'inject_header', key: '', value: '', enabled: true }
}
