import type { EndpointRef } from './endpointRef.interface'

export interface McpResource {
  id: string
  name: string
  uri: string
  description?: string
  mimeType?: string
  content: string
  editorData?: string
  type?: 'static' | 'dynamic'
  endpointRef?: EndpointRef
  endpointSource?: string
  inputDefaults?: Record<string, unknown>
  iteratorPath?: string
  errorConfig?: { message: string }
  enabled?: boolean
}
