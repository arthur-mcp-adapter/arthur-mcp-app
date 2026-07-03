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

export function formatMcpResult(data: unknown) {
  const rpc = parseMcpResponse(data)
  if (rpc?.error) return { text: JSON.stringify(rpc.error, null, 2), isError: true }
  const result = rpc?.result ?? rpc
  const content = result?.content ?? rpc?.content
  const text = result?.messages?.[0]?.content?.text ?? content?.[0]?.text
  if (typeof text === 'string') {
    try { return { text: JSON.stringify(JSON.parse(text), null, 2), isError: !!result?.isError } } catch { return { text, isError: !!result?.isError } }
  }
  return { text: JSON.stringify(result, null, 2), isError: !!result?.isError }
}
