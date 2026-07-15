export interface AuditEntry {
  _id: string
  userId?: string
  username: string
  action: string
  entity: string
  entityId?: string
  entityName?: string
  details?: string
  ip?: string
  createdAt: string
}
