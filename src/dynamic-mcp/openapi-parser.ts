import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';
import { convertToJsonSchema } from './schema-converter';
import type {
  NormalizedEndpoint,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedSpec,
  SecurityScheme,
} from './types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

/**
 * Accepts a pre-parsed object (JSON/YAML) or a URL/path string.
 * Usa swagger-parser para resolver todos os $ref antes de normalizar.
 */
export async function parseSpec(specInput: Record<string, unknown> | string): Promise<NormalizedSpec> {
  const api = await SwaggerParser.dereference(specInput as any);
  if (isSwagger2(api)) return normalizeV2(api as OpenAPIV2.Document);
  return normalizeV3(api as OpenAPIV3.Document);
}

function isSwagger2(api: OpenAPI.Document): boolean {
  return 'swagger' in api && (api as OpenAPIV2.Document).swagger === '2.0';
}

// ─── OpenAPI 3.x ────────────────────────────────────────────────────────────

function normalizeV3(doc: OpenAPIV3.Document): NormalizedSpec {
  const endpoints: NormalizedEndpoint[] = [];
  const paths = doc.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const pathParams =
      (pathItem.parameters as OpenAPIV3.ParameterObject[] | undefined)?.map(normalizeV3Param) ?? [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (!operation) continue;

      const opParams =
        (operation.parameters as OpenAPIV3.ParameterObject[] | undefined)?.map(normalizeV3Param) ?? [];

      endpoints.push({
        method,
        path,
        operationId: operation.operationId ?? generateOperationId(method, path),
        summary: operation.summary,
        description: operation.description,
        parameters: mergeParams(pathParams, opParams),
        requestBody: normalizeV3Body(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined),
        responses: normalizeV3Responses(
          (operation.responses ?? {}) as Record<string, OpenAPIV3.ResponseObject>,
        ),
        tags: operation.tags,
        deprecated: operation.deprecated,
      });
    }
  }

  return {
    info: { title: doc.info.title, version: doc.info.version, description: doc.info.description },
    servers: doc.servers?.map((s) => ({ url: s.url })) ?? [{ url: 'http://localhost' }],
    endpoints,
    securitySchemes: normalizeV3Security(doc),
  };
}

function normalizeV3Param(p: OpenAPIV3.ParameterObject): NormalizedParameter {
  return {
    name: p.name,
    in: p.in as NormalizedParameter['in'],
    required: p.required ?? p.in === 'path',
    description: p.description,
    schema: convertToJsonSchema((p.schema as Record<string, unknown>) ?? { type: 'string' }),
  };
}

function normalizeV3Body(body: OpenAPIV3.RequestBodyObject | undefined): NormalizedRequestBody | undefined {
  if (!body?.content) return undefined;

  const jsonContent = body.content['application/json'];
  if (jsonContent?.schema) {
    return {
      required: body.required ?? false,
      description: body.description,
      contentType: 'application/json',
      schema: convertToJsonSchema(jsonContent.schema as Record<string, unknown>),
    };
  }

  const [contentType, mediaType] = Object.entries(body.content)[0] ?? [];
  if (contentType && (mediaType as OpenAPIV3.MediaTypeObject)?.schema) {
    return {
      required: body.required ?? false,
      description: body.description,
      contentType,
      schema: convertToJsonSchema((mediaType as OpenAPIV3.MediaTypeObject).schema as Record<string, unknown>),
    };
  }
  return undefined;
}

function normalizeV3Responses(
  responses: Record<string, OpenAPIV3.ResponseObject>,
): Record<string, NormalizedResponse> {
  const result: Record<string, NormalizedResponse> = {};
  for (const [code, resp] of Object.entries(responses)) {
    const jsonContent = resp.content?.['application/json'];
    result[code] = {
      description: resp.description,
      contentType: jsonContent ? 'application/json' : undefined,
      schema: jsonContent?.schema
        ? convertToJsonSchema(jsonContent.schema as Record<string, unknown>)
        : undefined,
    };
  }
  return result;
}

function normalizeV3Security(doc: OpenAPIV3.Document): Record<string, SecurityScheme> {
  const schemes: Record<string, SecurityScheme> = {};
  for (const [name, scheme] of Object.entries(doc.components?.securitySchemes ?? {})) {
    const s = scheme as OpenAPIV3.SecuritySchemeObject;
    if (s.type === 'apiKey') {
      schemes[name] = { type: 'apiKey', name: s.name, in: s.in as 'header' | 'query' | 'cookie' };
    } else if (s.type === 'http') {
      schemes[name] = { type: 'http', scheme: s.scheme, bearerFormat: s.bearerFormat };
    } else if (s.type === 'oauth2') {
      const flows: Record<string, { tokenUrl?: string; scopes: Record<string, string> }> = {};
      for (const [flowName, flow] of Object.entries(s.flows ?? {})) {
        if (flow) flows[flowName] = { tokenUrl: (flow as any).tokenUrl, scopes: flow.scopes ?? {} };
      }
      schemes[name] = { type: 'oauth2', flows };
    }
  }
  return schemes;
}

// ─── Swagger 2.0 ────────────────────────────────────────────────────────────

function normalizeV2(doc: OpenAPIV2.Document): NormalizedSpec {
  const baseUrl = `${doc.schemes?.[0] ?? 'https'}://${doc.host ?? 'localhost'}${doc.basePath ?? ''}`;
  const endpoints: NormalizedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;
    const pathParams =
      (pathItem.parameters as OpenAPIV2.Parameter[] | undefined)?.map(normalizeV2Param) ?? [];

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as any)[method] as OpenAPIV2.OperationObject | undefined;
      if (!operation) continue;

      const allParams = (operation.parameters as OpenAPIV2.Parameter[] | undefined) ?? [];
      const opParams = allParams.filter((p) => p.in !== 'body').map(normalizeV2Param);
      const bodyParam = allParams.find((p) => p.in === 'body') as
        | OpenAPIV2.InBodyParameterObject
        | undefined;

      endpoints.push({
        method,
        path,
        operationId: operation.operationId ?? generateOperationId(method, path),
        summary: operation.summary,
        description: operation.description,
        parameters: mergeParams(pathParams, opParams),
        requestBody: bodyParam
          ? {
              required: bodyParam.required ?? false,
              description: bodyParam.description,
              contentType: (operation as any).consumes?.[0] ?? 'application/json',
              schema: convertToJsonSchema(bodyParam.schema as Record<string, unknown>),
            }
          : undefined,
        responses: normalizeV2Responses(
          (operation.responses ?? {}) as Record<string, OpenAPIV2.ResponseObject>,
        ),
        tags: operation.tags,
        deprecated: operation.deprecated,
      });
    }
  }

  return {
    info: { title: doc.info.title, version: doc.info.version, description: doc.info.description },
    servers: [{ url: baseUrl }],
    endpoints,
    securitySchemes: normalizeV2Security(doc),
  };
}

function normalizeV2Param(p: OpenAPIV2.Parameter): NormalizedParameter {
  const g = p as OpenAPIV2.GeneralParameterObject;
  return {
    name: g.name,
    in: g.in as NormalizedParameter['in'],
    required: g.required ?? g.in === 'path',
    description: g.description,
    schema: convertToJsonSchema({ type: g.type, format: g.format, enum: g.enum, default: g.default }),
  };
}

function normalizeV2Responses(
  responses: Record<string, OpenAPIV2.ResponseObject>,
): Record<string, NormalizedResponse> {
  const result: Record<string, NormalizedResponse> = {};
  for (const [code, resp] of Object.entries(responses)) {
    result[code] = {
      description: resp.description,
      schema: resp.schema ? convertToJsonSchema(resp.schema as Record<string, unknown>) : undefined,
    };
  }
  return result;
}

function normalizeV2Security(doc: OpenAPIV2.Document): Record<string, SecurityScheme> {
  const schemes: Record<string, SecurityScheme> = {};
  for (const [name, scheme] of Object.entries(doc.securityDefinitions ?? {})) {
    if (scheme.type === 'apiKey') {
      schemes[name] = { type: 'apiKey', name: scheme.name, in: scheme.in as 'header' | 'query' };
    } else if (scheme.type === 'basic') {
      schemes[name] = { type: 'http', scheme: 'basic' };
    }
  }
  return schemes;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mergeParams(
  pathLevel: NormalizedParameter[],
  opLevel: NormalizedParameter[],
): NormalizedParameter[] {
  const map = new Map<string, NormalizedParameter>();
  for (const p of pathLevel) map.set(`${p.in}:${p.name}`, p);
  for (const p of opLevel) map.set(`${p.in}:${p.name}`, p);
  return [...map.values()];
}

function generateOperationId(method: string, path: string): string {
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((s) => (s.startsWith('{') && s.endsWith('}') ? `by_${s.slice(1, -1)}` : s.replace(/-/g, '_')));
  return `${method}_${segments.join('_')}`.toLowerCase();
}
