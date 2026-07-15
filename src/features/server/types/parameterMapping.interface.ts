// ─── Shared types for the server feature modules ──────────────────────────────

export interface ParameterMapping {
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
}
