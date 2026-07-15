// ─── Types ────────────────────────────────────────────────────────────────────

export interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  items?: JsonSchema
}
