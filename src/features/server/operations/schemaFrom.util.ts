import type { DbQueryParameter } from '../types'

export function schemaFrom(parameters: DbQueryParameter[]) {
  return {
    type: 'object',
    properties: Object.fromEntries(parameters.filter((p) => p.name.trim()).map((p) => [p.name.trim(), {
      type: p.type, ...(p.description?.trim() ? { description: p.description.trim() } : {}),
    }])),
    required: parameters.filter((p) => p.required && p.name.trim()).map((p) => p.name.trim()),
  }
}
