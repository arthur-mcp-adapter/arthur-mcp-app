import type { MetricSummary } from '../metricSummary.interface'
import { metricSum } from '../utils/metricSum.util'
import { metricValue } from '../utils/metricValue.util'

export function parseMetricSummary(metrics: string): MetricSummary {
  return {
    httpRequests: metricSum(metrics, 'http_requests_total'),
    httpErrors: metricSum(metrics, 'http_requests_errors_total'),
    mcpToolCalls: metricSum(metrics, 'mcp_tool_calls_total'),
    mcpToolErrors: metricSum(metrics, 'mcp_tool_errors_total'),
    externalHttpCalls: metricSum(metrics, 'mcp_external_http_requests_total'),
    memoryBytes: metricValue(metrics, 'process_resident_memory_bytes'),
    eventLoopLagSeconds: metricValue(metrics, 'nodejs_eventloop_lag_seconds'),
    uptimeSeconds: metricValue(metrics, 'process_uptime_seconds'),
  }
}
