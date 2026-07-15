import type { GeneratedTool, HeaderEntry, ParamEntry } from '../../types'

export function toolToFormState(tool: GeneratedTool | undefined) {
  if (!tool) {
    return { name: '', description: '', method: 'GET', path: '/', contentType: 'application/json', params: [] as ParamEntry[], staticHeaders: [] as HeaderEntry[], useOutputTemplate: false, outputTemplate: '' }
  }
  const { endpointRef, inputSchema } = tool
  return {
    name: tool.name,
    description: tool.description ?? '',
    method: endpointRef.method,
    path: endpointRef.path,
    contentType: endpointRef.contentType ?? 'application/json',
    params: (endpointRef.parameterMap ?? []).map((parameter) => ({
      id: Math.random().toString(36).slice(2),
      toolParamName: parameter.toolParamName,
      source: parameter.source,
      originalName: parameter.originalName,
      required: parameter.required,
      type: (inputSchema.properties as Record<string, { type?: string }> | undefined)?.[parameter.toolParamName]?.type ?? 'string',
      description: (inputSchema.properties as Record<string, { description?: string }> | undefined)?.[parameter.toolParamName]?.description ?? '',
    })) as ParamEntry[],
    staticHeaders: ((endpointRef as typeof endpointRef & { staticHeaders?: HeaderEntry[] }).staticHeaders ?? []).map((header) => ({
      id: Math.random().toString(36).slice(2),
      name: header.name,
      value: header.value,
    })) as HeaderEntry[],
    useOutputTemplate: !!tool.outputTemplate,
    outputTemplate: tool.outputTemplate ?? '',
  }
}
