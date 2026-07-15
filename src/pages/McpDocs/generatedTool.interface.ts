import type { JsonSchema } from './jsonSchema.interface'
import type { EndpointRef } from './endpointRef.interface'

export interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  endpointRef: EndpointRef
  enabled?: boolean
}
