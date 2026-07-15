import type { TemplateTool } from '../templateTool.interface'

export function buildToolPayload(tool: TemplateTool, baseUrl: string) {
  const parameterMap = tool.params.map((parameter) => ({
    toolParamName: parameter.name,
    source: parameter.in,
    originalName: parameter.originalName ?? parameter.name,
    required: parameter.required,
  }))

  const properties: Record<string, { type: string; description?: string }> = {}
  const required: string[] = []
  for (const parameter of tool.params) {
    properties[parameter.name] = { type: parameter.type, ...(parameter.description ? { description: parameter.description } : {}) }
    if (parameter.required) required.push(parameter.name)
  }

  return {
    name: tool.name,
    description: tool.description,
    method: tool.method,
    path: tool.path,
    baseUrl,
    contentType: 'application/json',
    parameterMap,
    inputSchema: { type: 'object', properties, ...(required.length ? { required } : {}) },
  }
}
