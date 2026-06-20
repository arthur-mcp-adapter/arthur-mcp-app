import type { AuthConfig, GeneratedTool } from '../dynamic-mcp/types';

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
  rawSpec?: Record<string, any>;
  tools: GeneratedTool[];
  auth: AuthConfig;
  status: string;
  errorMessage?: string;
  mcpApiKey?: string | null;
  mcpApiKeys: McpApiKeyEntry[];
  oauthClientId?: string | null;
  oauthClientSecret?: string | null;
  tags: string[];
  rateLimit: { enabled: boolean; requestsPerMinute: number };
  isPaused: boolean;
  maintenanceMode: { enabled: boolean; message: string };
  availabilityWindow: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> };
  alertConfig: { enabled: boolean; errorThresholdPct: number; notifyEmail: string };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISwaggerProjectRepository {
  findById(id: string): Promise<SwaggerProjectRecord | null>;
  findAll(filter?: { tags?: string[] }): Promise<SwaggerProjectRecord[]>;
  findAllIds(): Promise<string[]>;
  create(data: Omit<SwaggerProjectRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<SwaggerProjectRecord>;
  update(id: string, data: Partial<Omit<SwaggerProjectRecord, '_id'>>): Promise<SwaggerProjectRecord | null>;
  save(record: SwaggerProjectRecord): Promise<SwaggerProjectRecord>;
  delete(id: string): Promise<boolean>;
}
