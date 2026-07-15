export interface ExecLog {
  _id: string
  toolName: string
  source: 'mcp' | 'direct'
  statusCode: number
  responseTimeMs: number
  isError: boolean
  errorMessage?: string
  requestPayload?: unknown
  responsePayload?: unknown
  createdAt: string
}
