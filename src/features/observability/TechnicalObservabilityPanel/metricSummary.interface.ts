export interface MetricSummary {
  httpRequests: number
  httpErrors: number
  mcpToolCalls: number
  mcpToolErrors: number
  externalHttpCalls: number
  memoryBytes?: number
  eventLoopLagSeconds?: number
  uptimeSeconds?: number
}
