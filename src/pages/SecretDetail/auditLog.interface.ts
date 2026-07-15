// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  action: string
  resourceId?: string
  username?: string
  createdAt: string
}
