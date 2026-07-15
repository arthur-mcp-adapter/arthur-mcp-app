export interface ShareResource {
  id: string
  name: string
  uri: string
  description?: string
  mimeType?: string
  outputSchema?: Record<string, unknown>
}
