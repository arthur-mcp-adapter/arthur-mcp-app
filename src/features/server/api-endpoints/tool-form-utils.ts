import type { GeneratedTool, ParamEntry, HeaderEntry } from '../types'

export function emptyParam(): ParamEntry {
  return { id: Math.random().toString(36).slice(2), toolParamName: '', source: 'query', originalName: '', required: false, type: 'string', description: '' }
}

export function emptyHeader(): HeaderEntry {
  return { id: Math.random().toString(36).slice(2), name: '', value: '' }
}

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
    params: (endpointRef.parameterMap ?? []).map((pm) => ({
      id: Math.random().toString(36).slice(2),
      toolParamName: pm.toolParamName,
      source: pm.source,
      originalName: pm.originalName,
      required: pm.required,
      type: (inputSchema.properties as any)?.[pm.toolParamName]?.type ?? 'string',
      description: (inputSchema.properties as any)?.[pm.toolParamName]?.description ?? '',
    })) as ParamEntry[],
    staticHeaders: ((endpointRef as any).staticHeaders ?? []).map((h: { name: string; value: string }) => ({
      id: Math.random().toString(36).slice(2),
      name: h.name,
      value: h.value,
    })) as HeaderEntry[],
    useOutputTemplate: !!tool.outputTemplate,
    outputTemplate: tool.outputTemplate ?? '',
  }
}
