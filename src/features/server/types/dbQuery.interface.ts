import type { DbQueryParameter } from './dbQueryParameter.interface'
import type { JsonSchema } from './jsonSchema.interface'

export interface DbQuery {
  id: string
  name: string
  description?: string
  sourceType: string
  query?: string
  resultMode?: 'rows' | 'first' | 'count'
  parameters?: DbQueryParameter[]
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
}
