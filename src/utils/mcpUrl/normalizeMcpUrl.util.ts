export function normalizeMcpUrl(mcpUrl: string) {
  return mcpUrl.replace('/api/mcp/project/', '/api/mcp/server/')
}
