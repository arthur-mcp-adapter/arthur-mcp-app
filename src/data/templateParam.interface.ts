// ─── Template types ───────────────────────────────────────────────────────────

export interface TemplateParam {
  name: string
  originalName?: string
  in: 'path' | 'query' | 'body' | 'header'
  required: boolean
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  description: string
}
