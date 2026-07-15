import type { JsonSchema } from '../../types'

export function inferSchema(value: unknown): JsonSchema {
  if (value === null || value === undefined) return { type: 'string' }
  if (Array.isArray(value)) return { type: 'array', items: value.length > 0 ? inferSchema(value[0]) : {} }
  if (typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {}
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) properties[key] = inferSchema(nestedValue)
    return { type: 'object', properties }
  }
  if (typeof value === 'boolean') return { type: 'boolean' }
  if (typeof value === 'number') return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
  return { type: 'string' }
}
