import type { GeneratedTool } from '../../types'
import { backendUrl } from '../../../../config/urls'

export function buildMcpCurl(tool: GeneratedTool, mcpServerIdentifier: string, hasKeys: boolean): string {
  const url = backendUrl(`/api/mcp/server/${mcpServerIdentifier}`)
  const properties = tool.inputSchema.properties ?? {}
  const args = Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, `<${value.type ?? 'string'}>`]))
  const body = JSON.stringify(
    { jsonrpc: '2.0', method: 'tools/call', id: 1, params: { name: tool.name, arguments: args } },
    null,
    2,
  )
  const lines = [
    `curl -X POST "${url}" \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream'`,
  ]
  if (hasKeys) { lines[lines.length - 1] += ' \\'; lines.push(`  -H 'auth: <your-api-key>'`) }
  lines[lines.length - 1] += ' \\'
  lines.push(`  -d '${body}'`)
  return lines.join('\n')
}
