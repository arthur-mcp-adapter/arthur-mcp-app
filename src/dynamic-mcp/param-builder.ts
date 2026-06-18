import type { JsonSchema, NormalizedEndpoint, ParameterMapping } from './types';

export interface BuiltParams {
  inputSchema: JsonSchema;
  parameterMap: ParameterMapping[];
}

/**
 * Flattens path + query + header + body params into a single MCP inputSchema.
 * Cria o parameterMap para reconstruir a request HTTP a partir dos args.
 */
export function buildParams(endpoint: NormalizedEndpoint): BuiltParams {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const parameterMap: ParameterMapping[] = [];
  const usedNames = new Set<string>();

  // 1. Path params (always required)
  for (const param of endpoint.parameters.filter((p) => p.in === 'path')) {
    const name = uniqueName(param.name, usedNames);
    properties[name] = { ...param.schema, description: param.description ?? param.schema.description };
    required.push(name);
    parameterMap.push({ toolParamName: name, source: 'path', originalName: param.name, required: true });
  }

  // 2. Query params
  for (const param of endpoint.parameters.filter((p) => p.in === 'query')) {
    const name = uniqueName(param.name, usedNames, 'query');
    properties[name] = { ...param.schema, description: param.description ?? param.schema.description };
    if (param.required) required.push(name);
    parameterMap.push({ toolParamName: name, source: 'query', originalName: param.name, required: param.required });
  }

  // 3. Header params (skip standard ones)
  const skipHeaders = new Set(['content-type', 'accept', 'authorization']);
  for (const param of endpoint.parameters.filter(
    (p) => p.in === 'header' && !skipHeaders.has(p.name.toLowerCase()),
  )) {
    const name = uniqueName(param.name, usedNames, 'header');
    properties[name] = { ...param.schema, description: param.description ?? param.schema.description };
    if (param.required) required.push(name);
    parameterMap.push({ toolParamName: name, source: 'header', originalName: param.name, required: param.required });
  }

  // 4. Request body
  if (endpoint.requestBody?.schema) {
    const bodySchema = endpoint.requestBody.schema;

    if (bodySchema.properties && Object.keys(bodySchema.properties).length <= 15) {
      // Flatten body props to top level
      for (const [propName, propSchema] of Object.entries(bodySchema.properties)) {
        const name = uniqueName(propName, usedNames, 'body');
        properties[name] = propSchema;
        parameterMap.push({ toolParamName: name, source: 'body', originalName: propName, required: false });
        if (endpoint.requestBody.required && bodySchema.required?.includes(propName)) {
          required.push(name);
        }
      }
    } else {
      // Body complexo: envolve em "body"
      const name = uniqueName('body', usedNames);
      properties[name] = { ...bodySchema, description: endpoint.requestBody.description ?? bodySchema.description };
      if (endpoint.requestBody.required) required.push(name);
      parameterMap.push({ toolParamName: name, source: 'body', originalName: 'body', required: endpoint.requestBody.required });
    }
  }

  const inputSchema: JsonSchema = { type: 'object', properties };
  if (required.length > 0) inputSchema.required = required;

  return { inputSchema, parameterMap };
}

function uniqueName(name: string, used: Set<string>, prefix?: string): string {
  let candidate = name;
  if (used.has(candidate) && prefix) candidate = `${prefix}_${name}`;
  let suffix = 2;
  const base = candidate;
  while (used.has(candidate)) { candidate = `${base}_${suffix}`; suffix++; }
  used.add(candidate);
  return candidate;
}
