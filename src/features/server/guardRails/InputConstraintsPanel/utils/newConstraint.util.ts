import type { InputConstraint } from '../inputConstraint.interface'

export function newConstraint(): InputConstraint {
  return { id: crypto.randomUUID(), toolName: '*', paramName: '', type: 'required', value: '', enabled: true }
}
