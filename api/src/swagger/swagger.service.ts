import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { parseSpec } from '../dynamic-mcp/openapi-parser';
import { generateTools } from '../dynamic-mcp/tool-generator';
import { DynamicMcpService } from '../dynamic-mcp/dynamic-mcp.service';
import type { AuthConfig, DbConnectionConfig, DbQuery, EndpointRef, ExecutionRef, GeneratedTool, JsonSchema, McpResource, ToolChain, ToolComment } from '../dynamic-mcp/types';
import { testConnection, introspectSchema, executeWithRef } from '../dynamic-mcp/adapters/index';
import { buildRequest } from '../dynamic-mcp/request-builder';
import { applyAuth } from '../dynamic-mcp/auth-provider';
import { executeRequest } from '../dynamic-mcp/http-client';
import { PROJECT_REPO, PROMPT_REPO, SECRET_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository, McpApiKeyEntry, SwaggerProjectRecord } from './swagger-project.repository';
import { parsePostmanCollection } from './postman-parser';
import { SwaggerApiKeysService } from './swagger-api-keys.service';
import { SwaggerImportService } from './swagger-import.service';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { ErrorTrackingService } from '../error-tracking/error-tracking.service';
import type { IPromptRepository } from '../prompts/prompt.repository';
import type { ISecretRepository } from '../secrets/secret.repository';
import { resolveSecretRefsInValue } from '../dynamic-mcp/secret-resolver';
import { baseShareSlug, normalizeShareSlug, uniqueShareSlug } from './share-slug.util';

const SPEC_PATHS = [
  '/openapi.json', '/openapi.yaml', '/openapi.yml',
  '/swagger.json', '/swagger.yaml',
  '/api-docs', '/api-docs.json', '/api-docs.yaml',
  '/swagger/v2/api-docs', '/v2/api-docs',
  '/docs/api.json', '/api/openapi.json', '/api/swagger.json',
];

interface ShareToolDoc {
  name: string;
  description?: string;
  parameters: ShareToolParameterDoc[];
  outputSchema?: Record<string, unknown>;
  comments?: Array<{ text: string; author: string; createdAt: Date }>;
}

interface ShareToolParameterDoc {
  name: string;
  type?: string;
  description?: string;
  required: boolean;
  enum?: unknown[];
}

interface ShareResourceDoc {
  id: string;
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
  outputSchema?: Record<string, unknown>;
}

interface SharePromptDoc {
  promptId: string;
  name?: string;
  description?: string;
  arguments: string[];
  content?: string;
}

export interface ShareProjectInfo {
  name: string;
  mcpUrl: string;
  shareSlug?: string | null;
  hasKey: boolean;
  hasOAuthClient: boolean;
  description?: string;
  version?: string;
  status: string;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  tools: ShareToolDoc[];
  resources: ShareResourceDoc[];
  prompts: SharePromptDoc[];
}

function promptArguments(content?: string): string[] {
  if (!content) return [];
  return [...new Set([...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

function publicToolDescription(description?: string): string | undefined {
  const cleaned = description
    ?.replace(/\s*\[(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)(?:\s+[^\]]+)?\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || undefined;
}

function publicToolParameters(inputSchema?: Record<string, any>): ShareToolParameterDoc[] {
  const properties = inputSchema?.properties && typeof inputSchema.properties === 'object'
    ? inputSchema.properties as Record<string, Record<string, unknown>>
    : {};
  const required = new Set(Array.isArray(inputSchema?.required) ? inputSchema.required.map(String) : []);

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    type: typeof schema?.type === 'string' ? schema.type : undefined,
    description: typeof schema?.description === 'string' ? schema.description : undefined,
    required: required.has(name),
    enum: Array.isArray(schema?.enum) ? schema.enum : undefined,
  }));
}

@Injectable()
export class SwaggerService {
  private readonly logger = new Logger(SwaggerService.name);

  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    @Inject(PROMPT_REPO) private readonly promptRepo: IPromptRepository,
    @Inject(SECRET_REPO) private readonly secretRepo: ISecretRepository,
    private readonly dynamicMcp: DynamicMcpService,
    private readonly imports: SwaggerImportService,
    private readonly apiKeys: SwaggerApiKeysService,
    private readonly jwtSecretService: JwtSecretService,
    private readonly errorTracking: ErrorTrackingService,
  ) {}

  private async resolveConnectionConfig(server: SwaggerProjectRecord): Promise<DbConnectionConfig> {
    if (!server.connectionConfig) {
      throw new BadRequestException('No connection config found. Save connection details first.');
    }
    const secrets = await this.secretRepo.findAll(server.ownerId ?? undefined);
    return resolveSecretRefsInValue(
      server.connectionConfig,
      new Map(secrets.map((secret) => [secret.name, secret.value])),
    );
  }

  private dbQueryInputSchema(query: DbQuery): JsonSchema {
    if (query.inputSchema) return query.inputSchema;
    const parameters = query.parameters ?? [];
    return {
      type: 'object',
      properties: Object.fromEntries(parameters.map((parameter) => [parameter.name, {
        type: parameter.type,
        ...(parameter.description ? { description: parameter.description } : {}),
        ...(parameter.default !== undefined ? { default: parameter.default } : {}),
      }])),
      required: parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name),
    };
  }

  private dbQueryTool(query: DbQuery, existing?: GeneratedTool): GeneratedTool {
    return {
      ...existing,
      name: query.name,
      description: query.description ?? '',
      inputSchema: this.dbQueryInputSchema(query),
      ...(query.outputSchema ? { outputSchema: query.outputSchema } : { outputSchema: undefined }),
      executionRef: { type: 'db', dbQueryId: query.id },
      endpointRef: undefined,
      endpointSource: undefined,
      enabled: existing?.enabled ?? true,
    };
  }

  private parseContent(content: string, filename: string): Record<string, any> {
    try {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
        return yaml.load(content) as Record<string, any>;
      }
      return JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Failed to parse file. Make sure it is valid JSON or YAML.',
      );
    }
  }

  private validateSpec(spec: Record<string, any>): void {
    const isSwagger2 = spec.swagger === '2.0';
    const isOpenApi3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3.');
    if (!isSwagger2 && !isOpenApi3) {
      throw new BadRequestException('Invalid file: must be Swagger 2.0 or OpenAPI 3.x.');
    }
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      throw new BadRequestException('Invalid file: no endpoints (paths) found.');
    }
  }

  async previewSpec(
    content: string,
    filename: string,
    baseUrlOverride?: string,
  ): Promise<{
    name: string;
    version?: string;
    description?: string;
    resolvedBaseUrl: string;
    totalTools: number;
    tools: Array<{ name: string; description?: string; method: string; path: string }>;
  }> {
    return this.imports.previewSpec(content, filename, baseUrlOverride);
  }

  async create(
    content: string,
    filename: string,
    ownerId: string,
    baseUrlOverride?: string,
    auth?: AuthConfig,
  ): Promise<SwaggerProjectRecord> {
    return this.imports.create(content, filename, ownerId, baseUrlOverride, auth);
  }

  findAll(tags?: string[], ownerId?: string): Promise<SwaggerProjectRecord[]> {
    return this.projectRepo.findAll({ ...(tags?.length ? { tags } : {}), ownerId });
  }

  async updateTags(id: string, tags: string[]): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { tags: tags.map((t) => t.trim()).filter(Boolean) });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async updateRateLimit(
    id: string,
    dto: { enabled: boolean; requestsPerMinute: number },
  ): Promise<SwaggerProjectRecord> {
    if (dto.requestsPerMinute < 1 || dto.requestsPerMinute > 10_000) {
      throw new BadRequestException('requestsPerMinute must be between 1 and 10000.');
    }
    const server = await this.projectRepo.update(id, { rateLimit: dto });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async updateResponseConfig(
    id: string,
    dto: { enabled: boolean; maxResponseLen?: number; maxDepth?: number; arraySlice?: number; errorTruncateLen?: number },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { responseConfig: dto } as any);
    if (!server) throw new NotFoundException('Project not found.');
    this.dynamicMcp.invalidate(id);
    return server;
  }

  async duplicate(id: string): Promise<SwaggerProjectRecord> {
    const source = await this.projectRepo.findById(id);
    if (!source) throw new NotFoundException('Project not found.');

    const { _id, createdAt, updatedAt, mcpApiKey, mcpApiKeys, ...rest } = source;
    const name = `${source.name} (copy)`;
    const shareSlug = uniqueShareSlug(name, await this.projectRepo.findAll(), id);
    return this.projectRepo.create({
      ...rest,
      name,
      shareSlug,
      mcpApiKeys: [],
    });
  }

  async findOne(id: string): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.projectRepo.delete(id);
    if (!deleted) throw new NotFoundException('Project not found.');
    this.dynamicMcp.invalidate(id);
  }

  async generateApiKey(id: string): Promise<{ mcpApiKey: string }> {
    return this.apiKeys.generateLegacyKey(id);
  }

  async revokeApiKey(id: string): Promise<void> {
    return this.apiKeys.revokeLegacyKey(id);
  }

  async addApiKey(id: string, name: string): Promise<McpApiKeyEntry> {
    return this.apiKeys.addKey(id, name);
  }

  async removeApiKey(id: string, keyId: string): Promise<void> {
    return this.apiKeys.removeKey(id, keyId);
  }

  async reimportSpec(
    id: string,
    content: string,
    filename: string,
    baseUrlOverride?: string,
  ): Promise<{ added: number; updated: number; baseUrl: string }> {
    return this.imports.reimportSpec(id, content, filename, baseUrlOverride);
  }

  async createEmpty(dto: { name: string; description?: string; baseUrl: string; tags?: string[] }, ownerId: string): Promise<SwaggerProjectRecord> {
    const name = dto.name.trim();
    const shareSlug = uniqueShareSlug(name, await this.projectRepo.findAll());
    return this.projectRepo.create({
      name,
      shareSlug,
      description: dto.description?.trim() || undefined,
      baseUrl: dto.baseUrl.trim(),
      tools: [],
      auth: { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      resources: [],
      prompts: [],
      chains: [],
      tags: (dto.tags ?? []).map((t) => t.trim()).filter(Boolean),
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
      ownerId,
    });
  }

  async updateOAuthClient(
    id: string,
    dto: { oauthClientId: string | null; oauthClientSecret: string | null },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, {
      oauthClientId: dto.oauthClientId,
      oauthClientSecret: dto.oauthClientSecret,
    });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async updateShareSlug(id: string, value: string): Promise<SwaggerProjectRecord> {
    const normalized = normalizeShareSlug(value);
    if (normalized.length < 3 || normalized.length > 80) {
      throw new BadRequestException('Share slug must be between 3 and 80 characters.');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw new BadRequestException('Share slug may contain only lowercase letters, numbers, and hyphens.');
    }

    const allServers = await this.projectRepo.findAll();
    const conflict = allServers.find((server) => server._id !== id && server.shareSlug === normalized);
    if (conflict) throw new BadRequestException('Share slug is already used by another server.');

    const server = await this.projectRepo.update(id, { shareSlug: normalized });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async updateAuth(id: string, auth: AuthConfig): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { auth });
    if (!server) throw new NotFoundException('Project not found.');
    this.dynamicMcp.invalidate(id);
    return server;
  }

  async updateInfo(id: string, dto: { name?: string; description?: string }): Promise<SwaggerProjectRecord> {
    const updates: Partial<SwaggerProjectRecord> = {};
    if (dto.name?.trim()) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description.trim() || undefined;

    const server = await this.projectRepo.update(id, updates);
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async updateToolMeta(
    id: string,
    currentName: string,
    dto: { name?: string; description?: string; enabled?: boolean },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const tool = server.tools.find((t) => t.name === currentName) as any;
    if (!tool) throw new NotFoundException(`Tool "${currentName}" not found.`);

    if (dto.name?.trim()) tool.name = dto.name.trim();
    if (dto.description !== undefined) tool.description = dto.description.trim() || undefined;
    if (typeof dto.enabled === 'boolean') tool.enabled = dto.enabled;

    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async updateToolOutputSchema(
    id: string,
    toolName: string,
    outputSchema: Record<string, unknown> | null,
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const tool = server.tools.find((t) => t.name === toolName) as any;
    if (!tool) throw new NotFoundException(`Tool "${toolName}" not found.`);

    tool.outputSchema = outputSchema ?? undefined;

    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async removeTool(id: string, toolName: string): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const idx = server.tools.findIndex((t) => t.name === toolName);
    if (idx === -1) throw new NotFoundException(`Tool "${toolName}" not found.`);

    server.tools.splice(idx, 1);
    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async updateTool(
    id: string,
    currentName: string,
    dto: {
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
    },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const idx = server.tools.findIndex((t) => t.name === currentName);
    if (idx === -1) throw new NotFoundException(`Tool "${currentName}" not found.`);

    const existing = server.tools[idx] as any;
    (server.tools as any)[idx] = {
      // preserve fields not managed by this form (enabled, comments, endpointSource, etc.)
      ...existing,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema,
      ...(dto.outputTemplate ? { outputTemplate: dto.outputTemplate } : { outputTemplate: undefined }),
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap,
        ...(dto.staticHeaders?.length ? { staticHeaders: dto.staticHeaders } : {}),
      },
    };

    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async addTool(
    id: string,
    dto: {
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
    },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const nameClean = dto.name.trim();
    if (server.tools.find((t) => t.name === nameClean)) {
      throw new BadRequestException(`A tool named "${nameClean}" already exists.`);
    }

    server.tools.push({
      name: nameClean,
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema as any,
      ...(dto.outputSchema ? { outputSchema: dto.outputSchema } : {}),
      ...(dto.outputTemplate ? { outputTemplate: dto.outputTemplate } : {}),
      ...(dto.errorConfig ? { errorConfig: dto.errorConfig } : {}),
      ...(dto.endpointSource ? { endpointSource: dto.endpointSource } : {}),
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap as any,
        ...(dto.staticHeaders?.length ? { staticHeaders: dto.staticHeaders } : {}),
      },
    } as any);

    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async updateBaseUrl(id: string, baseUrl: string): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    server.baseUrl = baseUrl;
    server.tools = server.tools.map((t) => ({
      ...t,
      endpointRef: t.endpointRef ? { ...t.endpointRef, baseUrl } : t.endpointRef,
    })) as typeof server.tools;

    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async setPaused(id: string, isPaused: boolean): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { isPaused });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async setMaintenanceMode(id: string, dto: { enabled: boolean; message?: string }): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, {
      maintenanceMode: { enabled: dto.enabled, message: dto.message ?? '' },
    });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async setAvailabilityWindow(
    id: string,
    dto: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { availabilityWindow: dto });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async setAlertConfig(
    id: string,
    dto: { enabled: boolean; errorThresholdPct: number; notifyEmail: string },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { alertConfig: dto });
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async setTenantConfig(
    id: string,
    dto: { enabled: boolean; params: Array<{ name: string; type: string; description?: string }> },
  ): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.update(id, { tenantConfig: dto } as any);
    if (!server) throw new NotFoundException('Project not found.');
    return server;
  }

  async addToolComment(id: string, toolName: string, text: string, author: string): Promise<ToolComment> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const tool = server.tools.find((t) => t.name === toolName) as any;
    if (!tool) throw new NotFoundException(`Tool "${toolName}" not found.`);

    const comment: ToolComment = { id: crypto.randomUUID(), text: text.trim(), author, createdAt: new Date() };
    if (!tool.comments) tool.comments = [];
    tool.comments.push(comment);
    await this.projectRepo.save(server);
    return comment;
  }

  // ── Resources ─────────────────────────────────────────────────────────────────

  async addResource(id: string, dto: Omit<McpResource, 'id'>): Promise<McpResource> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const entry: McpResource = { id: crypto.randomUUID(), ...dto };
    server.resources.push(entry);
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return entry;
  }

  async updateResource(id: string, resourceId: string, dto: Partial<Omit<McpResource, 'id'>>): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const r = server.resources.find((r) => r.id === resourceId) as any;
    if (!r) throw new NotFoundException('Resource not found.');
    Object.assign(r, dto);
    const saved = await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async deleteResource(id: string, resourceId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const idx = server.resources.findIndex((r) => r.id === resourceId);
    if (idx === -1) throw new NotFoundException('Resource not found.');
    server.resources.splice(idx, 1);
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
  }

  // ── Prompts (project references to global prompts) ───────────────────────────

  async addPromptRef(id: string, promptId: string): Promise<{ promptId: string }> {
    if (!promptId?.trim()) throw new BadRequestException('promptId is required.');
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const prompt = await this.promptRepo.findById(promptId);
    if (!prompt || prompt.ownerId !== server.ownerId) throw new NotFoundException('Prompt not found.');
    const refs = server.prompts as Array<{ promptId: string }>;
    if (refs.some((r) => r.promptId === promptId)) return { promptId };
    refs.push({ promptId });
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return { promptId };
  }

  async removePromptRef(id: string, promptId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const refs = server.prompts as Array<{ promptId: string }>;
    const idx = refs.findIndex((r) => r.promptId === promptId);
    if (idx === -1) throw new NotFoundException('Prompt reference not found.');
    refs.splice(idx, 1);
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
  }

  async togglePromptEnabled(id: string, promptId: string, enabled: boolean): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const ref = (server.prompts as Array<{ promptId: string; enabled?: boolean }>).find((r) => r.promptId === promptId);
    if (!ref) throw new NotFoundException('Prompt reference not found.');
    ref.enabled = enabled;
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
  }

  // ── Tool Chains ───────────────────────────────────────────────────────────────

  async addChain(id: string, dto: Omit<ToolChain, 'id'>): Promise<ToolChain> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const chainId = crypto.randomUUID();
    const chain: ToolChain = { ...dto, id: chainId };
    server.chains = [...(server.chains ?? []), chain];
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return chain;
  }

  async updateChain(id: string, chainId: string, dto: Partial<Omit<ToolChain, 'id'>>): Promise<ToolChain> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const idx = (server.chains ?? []).findIndex((c) => c.id === chainId);
    if (idx === -1) throw new NotFoundException('Chain not found.');
    const updated: ToolChain = { ...server.chains[idx], ...dto, id: chainId };
    server.chains[idx] = updated;
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
    return updated;
  }

  async deleteChain(id: string, chainId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const idx = (server.chains ?? []).findIndex((c) => c.id === chainId);
    if (idx === -1) throw new NotFoundException('Chain not found.');
    server.chains.splice(idx, 1);
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);
  }

  async deleteToolComment(id: string, toolName: string, commentId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    const tool = server.tools.find((t) => t.name === toolName) as any;
    if (!tool) throw new NotFoundException(`Tool "${toolName}" not found.`);
    tool.comments = (tool.comments ?? []).filter((c: ToolComment) => c.id !== commentId);
    await this.projectRepo.save(server);
  }

  async discoverSpec(baseUrl: string): Promise<{ found: boolean; specUrl?: string; paths: { url: string; status: number }[] }> {
    return this.imports.discoverSpec(baseUrl);
  }

  async testConnection(
    baseUrl: string,
    auth?: AuthConfig,
  ): Promise<{ success: boolean; statusCode?: number; message: string; responseTimeMs: number }> {
    return this.imports.testConnection(baseUrl, auth);
  }

  async fromPostman(content: string, ownerId: string, baseUrlOverride?: string): Promise<SwaggerProjectRecord> {
    return this.imports.fromPostman(content, ownerId, baseUrlOverride);
  }

  async previewPostman(
    content: string,
    baseUrlOverride?: string,
  ): Promise<{
    name: string;
    resolvedBaseUrl: string;
    totalTools: number;
    tools: Array<{ name: string; description?: string; method: string; path: string }>;
  }> {
    return this.imports.previewPostman(content, baseUrlOverride);
  }

  async getHealthSummary(): Promise<{ serverId: string; errorRatePct: number; lastCallAt?: Date; totalCalls: number }[]> {
    const ids = await this.projectRepo.findAllIds();
    return ids.map((id) => ({ serverId: id, errorRatePct: 0, totalCalls: 0 }));
  }

  async generateShareLink(serverId: string): Promise<{ url: string; shareSlug: string }> {
    let server = await this.projectRepo.findById(serverId);
    if (!server) throw new NotFoundException('Project not found.');
    if (!server.shareSlug) {
      const generated = uniqueShareSlug(server.name, await this.projectRepo.findAll(), serverId);
      server = await this.projectRepo.update(serverId, { shareSlug: generated }) ?? { ...server, shareSlug: generated };
    }
    const slug = server.shareSlug || baseShareSlug(server.name);
    return { url: `/mcp-swagger/${slug}`, shareSlug: slug };
  }

  /** Legacy: verifies a previously issued share token. Kept so links generated before the permanent slug link existed keep working. */
  async getProjectForShare(
    token: string,
  ): Promise<ShareProjectInfo> {
    let payload: any;
    try {
      payload = jwt.verify(token, await this.jwtSecretService.getSecret());
    } catch {
      throw new BadRequestException('Invalid or expired share link.');
    }

    const server = await this.projectRepo.findById(payload.serverId);
    if (!server) throw new NotFoundException('Project not found.');
    return this.buildShareInfo(server);
  }

  /** Permanent public lookup by share slug — the current share-link format. Access is revoked by changing the slug. */
  async getProjectForShareBySlug(slug: string): Promise<ShareProjectInfo> {
    const server = await this.projectRepo.findByIdOrShareSlug(slug);
    if (!server) throw new NotFoundException('Project not found.');
    return this.buildShareInfo(server);
  }

  private async buildShareInfo(server: SwaggerProjectRecord): Promise<ShareProjectInfo> {
    const dbQueries = server.dbQueries ?? [];
    const dbQueryById = new Map(dbQueries.map((query) => [query.id, query]));

    const prompts = await Promise.all((server.prompts ?? []).filter((ref) => ref.enabled !== false).map(async (ref) => {
      const prompt = ref.promptId ? await this.promptRepo.findById(ref.promptId) : null;
      return {
        promptId: ref.promptId,
        name: prompt?.name,
        description: prompt?.description,
        arguments: promptArguments(prompt?.content),
        content: prompt?.content,
      };
    }));

    const tools: ShareToolDoc[] = (server.tools ?? []).filter((tool) => tool.enabled !== false).map((tool) => ({
      name: tool.name,
      description: publicToolDescription(tool.description),
      parameters: publicToolParameters(tool.inputSchema as Record<string, any> | undefined),
      outputSchema: tool.outputSchema,
      comments: tool.comments?.map((comment) => ({
        text: comment.text,
        author: comment.author,
        createdAt: comment.createdAt,
      })),
    }));

    const resources: ShareResourceDoc[] = (server.resources ?? []).filter((resource) => resource.enabled !== false).map((resource) => {
      const dbQuery = resource.queryRef?.dbQueryId ? dbQueryById.get(resource.queryRef.dbQueryId) : undefined;
      return {
        id: resource.id,
        name: resource.name,
        uri: resource.uri,
        description: resource.description,
        mimeType: resource.mimeType,
        outputSchema: dbQuery?.outputSchema,
      };
    });

    return {
      name: server.name,
      description: server.description,
      version: server.version,
      status: server.status,
      shareSlug: server.shareSlug ?? null,
      mcpUrl: `/api/mcp/server/${server.shareSlug || server._id}`,
      hasKey: (server.mcpApiKeys?.length ?? 0) > 0 || !!server.mcpApiKey,
      hasOAuthClient: !!server.oauthClientId,
      toolCount: tools.length,
      resourceCount: resources.length,
      promptCount: prompts.length,
      tools,
      resources,
      prompts,
    };
  }

  async testEndpoint(
    id: string,
    endpointRef: EndpointRef,
    args: Record<string, unknown>,
  ): Promise<{ status: number; body: string; contentType: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');
    let httpReq = buildRequest(args, endpointRef);
    httpReq = await applyAuth(httpReq, server.auth);
    const res = await executeRequest(httpReq);
    return { status: res.status, body: res.body, contentType: res.contentType };
  }

  async updateConnectionConfig(id: string, cfg: DbConnectionConfig): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    await this.projectRepo.update(id, { connectionConfig: cfg } as any);
    this.dynamicMcp.invalidate(id);
  }

  async testDbConnection(id: string): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const sourceType = (server.tags ?? []).find((t) => t.startsWith('source:'))?.slice(7) ?? 'rest';
    try {
      const cfg = await this.resolveConnectionConfig(server);
      const result = await testConnection(sourceType, cfg);
      return result;
    } catch (err: any) {
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { server_id: id, source_type: sourceType, operation: 'test_db_connection' },
      });
      return { ok: false, error: err?.message ?? 'Connection failed' };
    }
  }

  async introspectDbSchema(id: string): Promise<{
    tables?: Array<{ name: string; columns: Array<{ name: string; type: string; nullable: boolean }> }>;
    collections?: string[];
  }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const cfg = await this.resolveConnectionConfig(server);
    const sourceType = (server.tags ?? []).find((t) => t.startsWith('source:'))?.slice(7) ?? 'rest';
    return introspectSchema(sourceType, cfg);
  }

  async testDbQuery(
    id: string,
    executionRef: ExecutionRef,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; error?: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const cfg = await this.resolveConnectionConfig(server);
    try {
      const result = await executeWithRef(executionRef, args, cfg);
      return { result };
    } catch (err: any) {
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { server_id: id, operation: 'test_db_query' },
      });
      return { result: null, error: err?.message ?? 'Query failed' };
    }
  }

  // ── DbQuery CRUD ────────────────────────────────────────────────────────────

  async listDbQueries(id: string): Promise<DbQuery[]> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    return server.dbQueries ?? [];
  }

  async addDbQuery(id: string, dto: Omit<DbQuery, 'id'>): Promise<DbQuery> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const query: DbQuery = { ...dto, id: crypto.randomUUID() };
    if ((server.tools ?? []).some((tool) => tool.name === query.name)) {
      throw new BadRequestException(`A tool named "${query.name}" already exists.`);
    }
    const updated = await this.projectRepo.update(id, {
      dbQueries: [...(server.dbQueries ?? []), query],
      tools: [...(server.tools ?? []), this.dbQueryTool(query)],
    });
    if (!updated) throw new NotFoundException('Server not found.');
    this.dynamicMcp.invalidate(id);
    return query;
  }

  async updateDbQuery(id: string, queryId: string, dto: Partial<Omit<DbQuery, 'id'>>): Promise<DbQuery> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const queries = server.dbQueries ?? [];
    const idx = queries.findIndex((q) => q.id === queryId);
    if (idx === -1) throw new NotFoundException('Query not found.');
    const previous = queries[idx];
    queries[idx] = { ...previous, ...dto };
    const tools = [...(server.tools ?? [])];
    const toolIndex = tools.findIndex((tool) => tool.executionRef?.type === 'db' && tool.executionRef.dbQueryId === queryId);
    const nameConflict = tools.some((tool, index) => index !== toolIndex && tool.name === queries[idx].name);
    if (nameConflict) throw new BadRequestException(`A tool named "${queries[idx].name}" already exists.`);
    if (toolIndex === -1) tools.push(this.dbQueryTool(queries[idx]));
    else tools[toolIndex] = this.dbQueryTool(queries[idx], tools[toolIndex]);
    await this.projectRepo.update(id, { dbQueries: queries, tools });
    this.dynamicMcp.invalidate(id);
    return queries[idx];
  }

  async deleteDbQuery(id: string, queryId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const queries = (server.dbQueries ?? []).filter((q) => q.id !== queryId);
    const tools = (server.tools ?? []).filter(
      (tool) => !(tool.executionRef?.type === 'db' && tool.executionRef.dbQueryId === queryId),
    );
    await this.projectRepo.update(id, { dbQueries: queries, tools });
    this.dynamicMcp.invalidate(id);
  }

  async runDbQuery(
    id: string,
    queryId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; error?: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const query = (server.dbQueries ?? []).find((q) => q.id === queryId);
    if (!query) throw new NotFoundException('Query not found.');
    const cfg = await this.resolveConnectionConfig(server);
    try {
      const { executeDbQuery } = await import('../dynamic-mcp/adapters/index');
      const result = await executeDbQuery(query, args, cfg);
      return { result };
    } catch (err: any) {
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { server_id: id, query_id: queryId, operation: 'run_db_query' },
      });
      return { result: null, error: err?.message ?? 'Query failed' };
    }
  }

  /** Run an inline (unsaved) DbQuery definition — used to test while creating. */
  async runQueryInline(
    id: string,
    query: DbQuery,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; error?: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Server not found.');
    const cfg = await this.resolveConnectionConfig(server);
    try {
      const { executeDbQuery } = await import('../dynamic-mcp/adapters/index');
      const result = await executeDbQuery(query, args, cfg);
      return { result };
    } catch (err: any) {
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { server_id: id, query_id: query.id, operation: 'run_query_inline' },
      });
      return { result: null, error: err?.message ?? 'Query failed' };
    }
  }
}
