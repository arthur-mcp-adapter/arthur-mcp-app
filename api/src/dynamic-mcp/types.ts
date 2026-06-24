/** JSON Schema subset aceito por tools MCP */
export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  format?: string;
  [key: string]: unknown;
};

export interface NormalizedSpec {
  info: { title: string; version: string; description?: string };
  servers: Array<{ url: string }>;
  endpoints: NormalizedEndpoint[];
  securitySchemes: Record<string, SecurityScheme>;
}

export interface NormalizedEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: Record<string, NormalizedResponse>;
  tags?: string[];
  deprecated?: boolean;
}

export interface NormalizedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface NormalizedRequestBody {
  required: boolean;
  description?: string;
  contentType: string;
  schema: JsonSchema;
}

export interface NormalizedResponse {
  description?: string;
  contentType?: string;
  schema?: JsonSchema;
}

export type SecurityScheme =
  | { type: 'apiKey'; name: string; in: 'header' | 'query' | 'cookie' }
  | { type: 'http'; scheme: string; bearerFormat?: string }
  | { type: 'oauth2'; flows: Record<string, { tokenUrl?: string; scopes: Record<string, string> }> };

/** Mapeamento de arg MCP → campo da request HTTP */
export interface ParameterMapping {
  toolParamName: string;
  source: 'path' | 'query' | 'header' | 'body';
  originalName: string;
  required: boolean;
}

export interface ToolComment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

/** Tool ready to be served by the MCP server and stored in the database */
export interface GeneratedTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  outputTemplate?: string;
  errorConfig?: { message: string };
  endpointRef: EndpointRef;
  endpointSource?: string; // name of the source endpoint tool this was derived from
  enabled?: boolean;
  comments?: ToolComment[];
}

export interface EndpointRef {
  method: string;
  path: string;
  baseUrl: string;
  contentType: string;
  parameterMap: ParameterMapping[];
  staticHeaders?: { name: string; value: string }[];
}

/** Per-project authentication configuration */
export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] };

export interface McpResource {
  id: string;
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
  content: string;
  editorData?: string;
  type?: 'static' | 'dynamic';
  endpointRef?: EndpointRef;
  endpointSource?: string; // name of the source endpoint tool this was derived from
  inputDefaults?: Record<string, unknown>;
  iteratorPath?: string;
  errorConfig?: { message: string };
  enabled?: boolean;
}

export interface McpPrompt {
  promptId: string;
  enabled?: boolean;
}

// ─── Tool Chaining ────────────────────────────────────────────────────────────

export type ChainInputSource =
  | { source: 'literal'; value: string }
  | { source: 'chain_input'; paramName: string }
  | { source: 'step_output'; stepId: string; jsonPath: string };

export interface ChainInputMapping {
  paramName: string;
  input: ChainInputSource;
}

export interface ChainStep {
  id: string;
  toolName: string;
  inputMapping: ChainInputMapping[];
}

export interface ToolChain {
  id: string;
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  steps: ChainStep[];
  enabled?: boolean;
}
