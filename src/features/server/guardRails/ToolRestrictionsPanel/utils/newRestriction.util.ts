import type { ToolRestriction } from '../toolRestriction.interface'

export function newRestriction(): ToolRestriction {
  return { id: crypto.randomUUID(), toolName: '', type: 'blocked', limit: 10, enabled: true }
}
