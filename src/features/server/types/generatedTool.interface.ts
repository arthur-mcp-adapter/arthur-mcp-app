import type { JsonSchema } from './jsonSchema.interface'
import type { EndpointRef } from './endpointRef.interface'
import type { ToolComment } from './toolComment.interface'

export interface GeneratedTool {
  id?: string
  name: string
  description?: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  outputTemplate?: string
  errorConfig?: { message: string }
  endpointRef: EndpointRef
  endpointSource?: string
  enabled?: boolean
  comments?: ToolComment[]
}
