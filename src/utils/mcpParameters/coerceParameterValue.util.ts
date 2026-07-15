export function coerceParameterValue(value: string, parameter: { type?: string }): unknown {
  if (value === '') return undefined
  if (parameter.type === 'number' || parameter.type === 'integer') return Number(value)
  if (parameter.type === 'boolean') return value === 'true'
  if (parameter.type === 'object' || parameter.type === 'array') {
    try { return JSON.parse(value) } catch { return value }
  }
  return value
}
