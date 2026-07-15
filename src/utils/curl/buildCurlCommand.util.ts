import { shellSingleQuote } from './shellSingleQuote.util'
import { absoluteUrl } from '../mcpUrl'
import { normalizeMcpUrl } from '../mcpUrl'
import { formatJson } from '../format'

export function buildCurlCommand({
  authKey,
  authMode,
  mcpUrl,
  payload,
}: {
  authKey: string
  authMode: 'apiKey' | 'oauthClientCredentials'
  mcpUrl: string
  payload: Record<string, unknown>
}) {
  const lines = [
    `curl -X POST ${shellSingleQuote(absoluteUrl(normalizeMcpUrl(mcpUrl)))} \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream' \\`,
  ]
  if (authKey.trim()) {
    if (authMode === 'oauthClientCredentials') {
      lines.push(`  -H ${shellSingleQuote(`Authorization: Bearer ${authKey.trim().replace(/^Bearer\s+/i, '')}`)} \\`)
    } else {
      lines.push(`  -H ${shellSingleQuote(`auth: ${authKey.trim()}`)} \\`)
    }
  }
  lines.push(`  --data ${shellSingleQuote(formatJson(payload))}`)
  return lines.join('\n')
}
