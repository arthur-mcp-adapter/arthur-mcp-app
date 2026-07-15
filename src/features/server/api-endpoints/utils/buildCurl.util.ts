import type { GeneratedTool } from '../../types'

export function buildCurl(tool: GeneratedTool): string {
  const { method, path, baseUrl, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  let url = `${baseUrl}${path}`
  ;(parameterMap ?? []).filter((parameter) => parameter.source === 'path').forEach((parameter) => {
    url = url.replace(`{${parameter.originalName}}`, `<${parameter.toolParamName}>`)
  })
  const queryParams = (parameterMap ?? []).filter((parameter) => parameter.source === 'query')
  if (queryParams.length) url += `?${queryParams.map((parameter) => `${parameter.originalName}=<${parameter.toolParamName}>`).join('&')}`
  const lines: string[] = [`curl -X ${method} "${url}"`]
  if (method !== 'GET') { lines[0] += ' \\'; lines.push(`  -H 'Content-Type: application/json'`) }
  ;(parameterMap ?? []).filter((parameter) => parameter.source === 'header').forEach((parameter) => {
    lines[lines.length - 1] += ' \\'
    lines.push(`  -H '${parameter.originalName}: <${parameter.toolParamName}>'`)
  })
  const bodyParams = (parameterMap ?? []).filter((parameter) => parameter.source === 'body')
  if (bodyParams.length) {
    const body: Record<string, string> = {}
    bodyParams.forEach((parameter) => { body[parameter.toolParamName] = `<${properties[parameter.toolParamName]?.type ?? 'string'}>` })
    lines[lines.length - 1] += ' \\'
    lines.push(`  -d '${JSON.stringify(body)}'`)
  }
  return lines.join('\n')
}
