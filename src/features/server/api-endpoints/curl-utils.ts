import type { GeneratedTool, JsonSchema } from '../types'

export function buildCurl(tool: GeneratedTool): string {
  const { method, path, baseUrl, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  let url = `${baseUrl}${path}`
  ;(parameterMap ?? []).filter((p) => p.source === 'path').forEach((p) => {
    url = url.replace(`{${p.originalName}}`, `<${p.toolParamName}>`)
  })
  const queryParams = (parameterMap ?? []).filter((p) => p.source === 'query')
  if (queryParams.length) url += '?' + queryParams.map((p) => `${p.originalName}=<${p.toolParamName}>`).join('&')
  const lines: string[] = [`curl -X ${method} "${url}"`]
  if (method !== 'GET') { lines[0] += ' \\'; lines.push(`  -H 'Content-Type: application/json'`) }
  ;(parameterMap ?? []).filter((p) => p.source === 'header').forEach((p) => {
    lines[lines.length - 1] += ' \\'; lines.push(`  -H '${p.originalName}: <${p.toolParamName}>'`)
  })
  const bodyParams = (parameterMap ?? []).filter((p) => p.source === 'body')
  if (bodyParams.length) {
    const bodyObj: Record<string, string> = {}
    bodyParams.forEach((p) => { bodyObj[p.toolParamName] = `<${properties[p.toolParamName]?.type ?? 'string'}>` })
    lines[lines.length - 1] += ' \\'; lines.push(`  -d '${JSON.stringify(bodyObj)}'`)
  }
  return lines.join('\n')
}

export function buildMcpCurl(tool: GeneratedTool, projectId: string, hasKeys: boolean): string {
  const url = `${window.location.origin}/api/mcp/server/${projectId}`
  const properties = tool.inputSchema.properties ?? {}
  const args = Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [k, `<${v.type ?? 'string'}>`])
  )
  const body = JSON.stringify(
    { jsonrpc: '2.0', method: 'tools/call', id: 1, params: { name: tool.name, arguments: args } },
    null, 2
  )
  const lines = [
    `curl -X POST "${url}" \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream'`,
  ]
  if (hasKeys) { lines[lines.length - 1] += ' \\'; lines.push(`  -H 'auth: <your-api-key>'`) }
  lines[lines.length - 1] += ` \\`
  lines.push(`  -d '${body}'`)
  return lines.join('\n')
}

export function inferSchema(value: unknown): JsonSchema {
  if (value === null || value === undefined) return { type: 'string' }
  if (Array.isArray(value)) return { type: 'array', items: value.length > 0 ? inferSchema(value[0]) : {} }
  if (typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      properties[k] = inferSchema(v)
    }
    return { type: 'object', properties }
  }
  if (typeof value === 'boolean') return { type: 'boolean' }
  if (typeof value === 'number') return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
  return { type: 'string' }
}
