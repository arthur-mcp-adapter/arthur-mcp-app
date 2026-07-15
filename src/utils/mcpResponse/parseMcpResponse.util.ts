/** Parses an MCP JSON-RPC response body, unwrapping SSE `data:` framing when present. */
export function parseMcpResponse(data: unknown): Record<string, any> {
  if (typeof data === 'object' && data !== null) return data as Record<string, any>
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) {
      try { return JSON.parse(match[1]) } catch { /* fall through */ }
    }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}
