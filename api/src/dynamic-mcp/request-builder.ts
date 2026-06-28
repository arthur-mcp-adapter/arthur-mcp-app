import type { EndpointRef, ParameterMapping } from './types';
import { getCorrelationContext } from '../observability/middlewares/correlation-id.middleware';

export interface PreparedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

export function buildRequest(
  args: Record<string, unknown>,
  endpointRef: EndpointRef,
  extraHeaders?: Record<string, string>,
): PreparedRequest {
  let path = endpointRef.path;
  const query: Record<string, string> = {};
  const headers: Record<string, string> = { ...extraHeaders };
  const correlation = getCorrelationContext();
  if (correlation) {
    headers['x-request-id'] = headers['x-request-id'] ?? correlation.requestId;
    headers['x-correlation-id'] = headers['x-correlation-id'] ?? correlation.correlationId;
    headers['x-trace-id'] = headers['x-trace-id'] ?? correlation.traceId;
  }
  for (const h of endpointRef.staticHeaders ?? []) {
    if (h.name) headers[h.name] = h.value;
  }
  const bodyParts: Record<string, unknown> = {};
  let hasBody = false;

  for (const mapping of endpointRef.parameterMap as ParameterMapping[]) {
    const value = args[mapping.toolParamName];
    if (value === undefined) continue;

    switch (mapping.source) {
      case 'path':
        path = path.replace(`{${mapping.originalName}}`, String(value));
        break;
      case 'query':
        query[mapping.originalName] = String(value);
        break;
      case 'header':
        headers[mapping.originalName] = String(value);
        break;
      case 'body':
        if (mapping.originalName === 'body') {
          Object.assign(bodyParts, value as Record<string, unknown>);
        } else {
          bodyParts[mapping.originalName] = value;
        }
        hasBody = true;
        break;
    }
  }

  const url = buildUrl(endpointRef.baseUrl, path, query);
  if (hasBody) headers['Content-Type'] = endpointRef.contentType ?? 'application/json';

  return {
    url,
    method: endpointRef.method,
    headers,
    body: hasBody ? bodyParts : undefined,
  };
}

function buildUrl(base: string, path: string, query: Record<string, string>): string {
  // OpenAPI paths always start with "/" (they are absolute).
  // new URL("/path", base) would discard the base pathname — e.g.:
  //   new URL("/pet", "https://api.example.com/v2/") → "https://api.example.com/pet"  (WRONG)
  // Concatenate directly to preserve the base pathname:
  //   "https://api.example.com/v2" + "/pet" → "https://api.example.com/v2/pet"  (CORRECT)
  const cleanBase = base.replace(/\/+$/, '');
  const url = new URL(cleanBase + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url.toString();
}
