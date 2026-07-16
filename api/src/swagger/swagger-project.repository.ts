import type { AuthConfig, DbConnectionConfig, DbQuery, GeneratedTool, McpPrompt, McpResource, ToolChain } from '../dynamic-mcp/types';
import type { OAuthConfig } from '../oauth/oauth-config.type';

export interface McpApiKeyEntry {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
}

export interface SwaggerProjectRecord {
  _id: string;
  name: string;
  baseUrl: string;
  description?: string;
  version?: string;
  shareSlug?: string | null;
  rawSpec?: Record<string, any>;
  tools: GeneratedTool[];
  auth: AuthConfig;
  status: string;
  errorMessage?: string;
  mcpApiKey?: string | null;
  mcpApiKeys: McpApiKeyEntry[];
  resources: McpResource[];
  prompts: McpPrompt[];
  chains: ToolChain[];
  oauthClientId?: string | null;
  oauthClientSecret?: string | null;
  oauthConfig?: OAuthConfig;
  tags: string[];
  rateLimit: { enabled: boolean; requestsPerMinute: number };
  isPaused: boolean;
  maintenanceMode: { enabled: boolean; message: string };
  availabilityWindow: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> };
  alertConfig: { enabled: boolean; errorThresholdPct: number; notifyEmail: string };
  tenantConfig?: { enabled: boolean; params: Array<{ name: string; type: 'string' | 'integer' | 'number' | 'boolean' | 'uuid' | 'hash'; description?: string }> };
  responseConfig?: {
    enabled: boolean;
    maxResponseLen?: number;
    maxDepth?: number;
    arraySlice?: number;
    errorTruncateLen?: number;
  };
  connectionConfig?: DbConnectionConfig;
  dbQueries?: DbQuery[];
  ownerId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISwaggerProjectRepository {
  findById(id: string): Promise<SwaggerProjectRecord | null>;
  findByIdOrShareSlug(identifier: string): Promise<SwaggerProjectRecord | null>;
  findAll(filter?: { tags?: string[]; ownerId?: string }): Promise<SwaggerProjectRecord[]>;
  findAllIds(): Promise<string[]>;
  create(data: Omit<SwaggerProjectRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<SwaggerProjectRecord>;
  update(id: string, data: Partial<Omit<SwaggerProjectRecord, '_id'>>): Promise<SwaggerProjectRecord | null>;
  save(record: SwaggerProjectRecord): Promise<SwaggerProjectRecord>;
  delete(id: string): Promise<boolean>;
}
