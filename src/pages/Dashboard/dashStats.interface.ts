// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashStats {
  period: { from: string; to: string }
  projects: { total: number; withApiKey: number; active: number }
  tools: { total: number }
  calls: { total: number; errors: number; successRate: number }
  topTools: { toolName: string; count: number; serverName: string }[]
  callsByBucket: { _id: string; calls: number; errors: number }[]
  recentProjects: { _id: string; name: string; toolCount: number; status: string; tags: string[] }[]
}
