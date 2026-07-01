import type { AuthConfig, DbQuery, EndpointRef, ExecutionRef, McpResource, ToolChain } from '../../dynamic-mcp/types';

export class CreateServerDto {
  name?: string;
  description?: string;
  baseUrl?: string;
  tags?: string[];
}

export class UpdateServerInfoDto {
  name?: string;
  description?: string;
}

export class UpdateToolMetaDto {
  name?: string;
  description?: string;
  enabled?: boolean;
}

export class ToolEndpointDto {
  name: string;
  description?: string;
  method: string;
  path: string;
  baseUrl: string;
  contentType?: string;
  parameterMap: Record<string, unknown>[];
  inputSchema: Record<string, unknown>;
  staticHeaders?: { name: string; value: string }[];
  outputTemplate?: string;
  outputSchema?: Record<string, unknown>;
  errorConfig?: { message: string };
  endpointSource?: string;
}

export class OAuthClientDto {
  oauthClientId: string | null;
  oauthClientSecret: string | null;
}

export class ShareSlugDto {
  shareSlug: string;
}

export class RateLimitDto {
  enabled: boolean;
  requestsPerMinute: number;
}

export class ResponseConfigDto {
  enabled: boolean;
  maxResponseLen?: number;
  maxDepth?: number;
  arraySlice?: number;
  errorTruncateLen?: number;
}

export class MaintenanceModeDto {
  enabled: boolean;
  message?: string;
}

export class AvailabilityWindowDto {
  enabled: boolean;
  timezone: string;
  schedule: Array<{ day: number; startHour: number; endHour: number }>;
}

export class AlertConfigDto {
  enabled: boolean;
  errorThresholdPct: number;
  notifyEmail: string;
}

export class TenantConfigDto {
  enabled: boolean;
  params: Array<{ name: string; type: string; description?: string }>;
}

export class RunEndpointDto {
  endpointRef: EndpointRef;
  args?: Record<string, unknown>;
}

export class TestDbQueryDto {
  executionRef: ExecutionRef;
  args?: Record<string, unknown>;
}

export class RunDbQueryDto {
  args?: Record<string, unknown>;
}

export class DbQueryDto implements Omit<DbQuery, 'id'> {
  name: string;
  description?: string;
  sourceType: string;
  query?: string;
  resultMode?: 'rows' | 'first' | 'count';
  collection?: string;
  operationType?: 'find' | 'findOne' | 'insertOne' | 'updateOne' | 'deleteOne' | 'aggregate' | 'count';
  filterTemplate?: string;
  projectionTemplate?: string;
  updateTemplate?: string;
  pipeline?: string;
  sortTemplate?: string;
  limitValue?: number;
  command?: string;
  keyPattern?: string;
  valueTemplate?: string;
  tableName?: string;
  dynamoOperation?: 'getItem' | 'putItem' | 'updateItem' | 'deleteItem' | 'query' | 'scan';
  esIndex?: string;
  esOperation?: 'search' | 'get' | 'index' | 'update' | 'delete';
  esBodyTemplate?: string;
  gqlDocument?: string;
  gqlOperationType?: 'query' | 'mutation';
  grpcService?: string;
  grpcMethod?: string;
  grpcRequestTemplate?: string;
  parameters?: DbQuery['parameters'];
  inputSchema?: DbQuery['inputSchema'];
  outputSchema?: DbQuery['outputSchema'];
  iteratorPath?: string;
}

export class ResourceDto implements Omit<McpResource, 'id'> {
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
  queryRef?: McpResource['queryRef'];
}

export class ChainDto implements Omit<ToolChain, 'id'> {
  name: string;
  description?: string;
  inputSchema: ToolChain['inputSchema'];
  steps: ToolChain['steps'];
  enabled?: boolean;
}

export class AuthConfigDto {
  auth: AuthConfig;
}
