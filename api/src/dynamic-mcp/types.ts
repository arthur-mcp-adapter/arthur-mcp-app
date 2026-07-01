/** JSON Schema subset accepted by MCP tools */
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

/** Mapping from MCP arg to HTTP request field */
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

// ─── DB Query definitions (reusable, stored on server record) ────────────────

export type SqlDialect =
  | 'postgresql' | 'mysql' | 'mariadb' | 'mssql' | 'oracle'
  | 'cockroachdb' | 'clickhouse' | 'cassandra' | 'snowflake';

/** Parameter defined on a DbQuery — analogous to ParameterMapping on an endpoint */
export interface DbQueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  description?: string;
  default?: unknown;
}

/**
 * Reusable data-source definition for non-HTTP integrations.
 * Analogous to an API endpoint in a REST server.
 * Tools and Resources reference these by `id`.
 */
export interface DbQuery {
  id: string;
  name: string;
  description?: string;
  /** Which integration type this query belongs to */
  sourceType: string;

  // ── SQL (postgresql, mysql, mariadb, mssql, oracle, cockroachdb, clickhouse, cassandra, snowflake)
  query?: string;                   // SQL string with :paramName placeholders
  resultMode?: 'rows' | 'first' | 'count';

  // ── MongoDB / Firestore
  collection?: string;
  operationType?: 'find' | 'findOne' | 'insertOne' | 'updateOne' | 'deleteOne' | 'aggregate' | 'count';
  filterTemplate?: string;          // JSON string with {{param}} placeholders
  projectionTemplate?: string;
  updateTemplate?: string;
  pipeline?: string;                // JSON string (array) for aggregate
  sortTemplate?: string;
  limitValue?: number;

  // ── Redis
  command?: string;                 // used in composite mode
  keyPattern?: string;              // key, prefix, query, or index key depending on redisTemplate
  valueTemplate?: string;           // value to write (composite SET/HSET/LPUSH)
  redisTemplate?: 'exact_key' | 'key_prefix' | 'key_range' | 'search_by_value' | 'secondary_index' | 'full_text' | 'composite';
  valuePattern?: string;            // search_by_value: substring to match against stored values
  keyPrefixFilter?: string;         // search_by_value: SCAN MATCH prefix
  redisMinScore?: string;           // key_range: ZRANGEBYSCORE min
  redisMaxScore?: string;           // key_range: ZRANGEBYSCORE max
  redisLimit?: number;              // max results for key_prefix / key_range / search_by_value / full_text
  redisFtIndex?: string;            // full_text: FT.SEARCH index name
  redisFetchValues?: boolean;       // key_prefix / secondary_index: GET value for each key

  // ── DynamoDB
  tableName?: string;
  dynamoOperation?: 'getItem' | 'putItem' | 'updateItem' | 'deleteItem' | 'query' | 'scan';
  keyConditionTemplate?: string;
  filterExpressionTemplate?: string;

  // ── Elasticsearch
  esIndex?: string;
  esOperation?: 'search' | 'get' | 'index' | 'update' | 'delete';
  esBodyTemplate?: string;          // JSON with {{param}}

  // ── GraphQL
  gqlDocument?: string;             // GraphQL query/mutation with $variable syntax
  gqlOperationType?: 'query' | 'mutation';

  // ── gRPC
  grpcService?: string;
  grpcMethod?: string;
  grpcRequestTemplate?: string;     // JSON with {{param}}

  // ── Common
  parameters?: DbQueryParameter[];
  inputSchema?: JsonSchema;         // MCP input contract derived from or overriding parameters
  outputSchema?: JsonSchema;        // MCP output contract for Tools/Resources generated from this operation
  iteratorPath?: string;            // for Resources: path in JSON response to iterate
}

// ─── Execution references (discriminated union) ───────────────────────────────

export type ExecutionRef =
  | {
      type: 'http';
      method: string; path: string; baseUrl: string;
      contentType: string; parameterMap: ParameterMapping[];
      staticHeaders?: { name: string; value: string }[];
    }
  /** Reference to a DbQuery stored on the server — primary form for non-HTTP tools */
  | { type: 'db'; dbQueryId: string }
  /** Static tool — renders a template string with {{param}} interpolation, no external call */
  | { type: 'static'; responseTemplate: string; mimeType?: string }
  // Legacy inline variants kept for backward compat
  | {
      type: 'sql';
      dialect: SqlDialect;
      query: string;
      paramStyle: 'named' | 'positional';
      resultMode: 'rows' | 'first' | 'count';
    }
  | {
      type: 'mongodb';
      collection: string;
      operation: 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'aggregate';
      filterTemplate?: unknown;
      projectionTemplate?: unknown;
      pipeline?: unknown[];
      documentTemplate?: unknown;
    }
  | { type: 'redis'; command?: string; keyPattern?: string; valueTemplate?: string; redisTemplate?: string; valuePattern?: string; keyPrefixFilter?: string; redisMinScore?: string; redisMaxScore?: string; redisLimit?: number; redisFtIndex?: string; redisFetchValues?: boolean }
  | { type: 'dynamodb'; table: string; operation: string; keyMapping: Record<string, string> }
  | { type: 'elasticsearch'; index: string; operation: string; queryTemplate?: unknown }
  | { type: 'snowflake'; query: string; warehouse?: string; schema?: string; paramStyle: 'named' | 'positional'; resultMode: 'rows' | 'first' | 'count' }
  | { type: 'graphql'; operationType: 'query' | 'mutation'; document: string; variableMap: ParameterMapping[] }
  | { type: 'grpc'; service: string; rpcMethod: string; requestMap: ParameterMapping[] }
  | { type: 'firestore'; collection: string; operation: string; filterTemplate?: unknown };

/** DB connection config — stored encrypted on the server record */
export interface DbConnectionConfig {
  // SQL
  host?: string; port?: number; database?: string; user?: string; password?: string; ssl?: boolean;
  // MongoDB
  uri?: string;
  // Redis
  redisHost?: string; redisPort?: number; redisPassword?: string; redisTls?: boolean;
  // DynamoDB
  dynamoRegion?: string; dynamoAccessKey?: string; dynamoSecretKey?: string; dynamoEndpoint?: string;
  // Elasticsearch
  esUrl?: string; esApiKey?: string; esUser?: string; esPassword?: string;
  // Snowflake
  snowflakeAccount?: string; snowflakeWarehouse?: string; snowflakeSchema?: string;
  // Firestore
  firestoreProject?: string; firestoreCredentials?: string;
  [key: string]: unknown;
}

/** Tool ready to be served by the MCP server and stored in the database */
export interface GeneratedTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  outputTemplate?: string;
  errorConfig?: { message: string };
  /** HTTP endpoint ref — kept for backward compat; new tools use executionRef */
  endpointRef?: EndpointRef;
  /** Unified execution ref — takes precedence over endpointRef when present */
  executionRef?: ExecutionRef;
  endpointSource?: string;
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
  endpointSource?: string;
  inputDefaults?: Record<string, unknown>;
  iteratorPath?: string;
  errorConfig?: { message: string };
  enabled?: boolean;
  /** DB-driven dynamic resource — reference a DbQuery by ID */
  queryRef?: {
    dbQueryId: string;
    inputDefaults?: Record<string, unknown>;
    iteratorPath?: string;
    /** Legacy inline executionRef — kept for backward compat */
    executionRef?: ExecutionRef;
  };
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
