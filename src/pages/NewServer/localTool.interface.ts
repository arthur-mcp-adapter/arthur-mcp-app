export interface LocalTool {
  id: string
  name: string
  originalName?: string
  description?: string
  method: string
  path: string
  enabled: boolean
  fromSpec: boolean
  outputSchema?: Record<string, unknown>
}
