import { normalizeMcpUrl } from './normalizeMcpUrl.util'

export function oauthTokenUrl(mcpUrl: string) {
  return normalizeMcpUrl(mcpUrl).replace(/^\/api\/mcp\/server\//, '/oauth/server/').replace(/^\/mcp\/server\//, '/oauth/server/') + '/token'
}
