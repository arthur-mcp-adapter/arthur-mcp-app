import { backendUrl } from '../config/urls'

export function normalizeMcpUrl(mcpUrl: string) {
  return mcpUrl.replace('/api/mcp/project/', '/api/mcp/server/')
}

export function oauthTokenUrl(mcpUrl: string) {
  return normalizeMcpUrl(mcpUrl).replace(/^\/api\/mcp\/server\//, '/oauth/server/').replace(/^\/mcp\/server\//, '/oauth/server/') + '/token'
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return backendUrl(path)
}
