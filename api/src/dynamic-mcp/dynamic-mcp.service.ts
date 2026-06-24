import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Handlebars from 'handlebars';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { AuthConfig, ChainInputSource, GeneratedTool, JsonSchema, McpResource, ToolChain } from './types';
import { buildRequest } from './request-builder';
import { executeRequest } from './http-client';
import { mapResponse, McpToolResult } from './response-mapper';
import { applyAuth, resolveSecretRefs } from './auth-provider';
import { ExecutionLogsService } from '../execution-logs/execution-logs.service';
import { PROJECT_REPO, PROMPT_REPO, SECRET_REPO, SETTINGS_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import type { IPromptRepository, PromptRecord } from '../prompts/prompt.repository';
import type { ISecretRepository } from '../secrets/secret.repository';
import type { ISettingsRepository } from '../settings/settings.repository';

interface TenantParamDef {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'uuid' | 'hash';
  description?: string;
  required?: boolean;
}

interface CachedProject {
  tools: GeneratedTool[];
  chains: ToolChain[];
  auth: AuthConfig;
  name: string;
  version: string;
  resources: McpResource[];
  prompts: PromptRecord[];
  secrets: Map<string, string>;
  tenantConfig: { enabled: boolean; params: TenantParamDef[] };
  globalRequestHeaders: Record<string, string>;
  expiresAt: number;
}

function validateToolArgs(args: Record<string, unknown>, schema: JsonSchema): string[] {
  const errors: string[] = [];
  const required = schema.required ?? [];
  const properties = schema.properties ?? {};

  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push(`required field missing: "${field}"`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    const prop = properties[key];
    if (!prop?.type) continue;
    const t = prop.type as string;
    if (t === 'string' && typeof value !== 'string') {
      errors.push(`"${key}" must be a string`);
    } else if (t === 'boolean' && typeof value !== 'boolean') {
      errors.push(`"${key}" must be a boolean`);
    } else if (t === 'array' && !Array.isArray(value)) {
      errors.push(`"${key}" must be an array`);
    } else if (t === 'integer' && !Number.isInteger(value)) {
      errors.push(`"${key}" must be an integer`);
    } else if (t === 'number' && typeof value !== 'number') {
      errors.push(`"${key}" must be a number`);
    }
  }

  return errors;
}

function compileAndRender(template: string, data: unknown): string {
  return Handlebars.compile(template)(data);
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce(
    (cur, key) => (cur != null && typeof cur === 'object' ? (cur as any)[key] : undefined),
    obj,
  );
}

@Injectable()
export class DynamicMcpService {
  private readonly logger = new Logger(DynamicMcpService.name);
  private readonly projectCache = new Map<string, CachedProject>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    @Inject(PROMPT_REPO) private readonly promptRepo: IPromptRepository,
    @Inject(SECRET_REPO) private readonly secretRepo: ISecretRepository,
    @Inject(SETTINGS_REPO) private readonly settingsRepo: ISettingsRepository,
    private readonly executionLogs: ExecutionLogsService,
  ) {}

  invalidate(serverId: string): void {
    this.projectCache.delete(serverId);
  }

  private async getProjectData(serverId: string): Promise<CachedProject> {
    const cached = this.projectCache.get(serverId);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const server = await this.projectRepo.findById(serverId);
    if (!server) throw new NotFoundException(`Server ${serverId} not found.`);

    const promptRefs = (server.prompts ?? []) as Array<{ promptId?: string; enabled?: boolean }>;
    const resolvedPrompts: PromptRecord[] = [];
    for (const ref of promptRefs) {
      if (!ref.promptId || ref.enabled === false) continue;
      const p = await this.promptRepo.findById(ref.promptId);
      if (p) resolvedPrompts.push(p);
    }

    const allSecrets = await this.secretRepo.findAll();
    const secretsMap = new Map(allSecrets.map((s) => [s.name, s.value]));

    const settings = await this.settingsRepo.getGlobal();
    const globalRequestHeaders = Object.fromEntries(
      (settings.globalRequestHeaders ?? []).filter((h) => h.name).map((h) => [h.name, h.value]),
    );

    const entry: CachedProject = {
      tools: server.tools ?? [],
      chains: server.chains ?? [],
      auth: server.auth ?? { type: 'none' },
      name: server.name,
      version: server.version ?? '1.0.0',
      resources: server.resources ?? [],
      prompts: resolvedPrompts,
      secrets: secretsMap,
      tenantConfig: (server as any).tenantConfig ?? { enabled: false, params: [] },
      globalRequestHeaders,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
    this.projectCache.set(serverId, entry);
    return entry;
  }

  private coerceTenantValue(value: string, type: TenantParamDef['type']): unknown {
    switch (type) {
      case 'integer': return parseInt(value, 10);
      case 'number': return parseFloat(value);
      case 'boolean': return value === 'true' || value === '1';
      default: return value;
    }
  }

  private injectTenantParams(
    args: Record<string, unknown>,
    tool: GeneratedTool,
    tenantConfig: CachedProject['tenantConfig'],
    queryParams: Record<string, string>,
  ): Record<string, unknown> {
    if (!tenantConfig.enabled || tenantConfig.params.length === 0) return args;
    const injected = { ...args };
    for (const def of tenantConfig.params) {
      const value = queryParams[def.name];
      if (value === undefined) continue;
      const mapping = tool.endpointRef.parameterMap.find((m) => m.originalName === def.name);
      if (!mapping) continue;
      injected[mapping.toolParamName] = this.coerceTenantValue(value, def.type);
    }
    return injected;
  }

  async createMcpServer(serverId: string, queryParams: Record<string, string> = {}): Promise<Server> {
    const { tools: allTools, chains: allChains, auth: rawAuth, name, version, resources, prompts, secrets, tenantConfig, globalRequestHeaders } = await this.getProjectData(serverId);
    const auth = resolveSecretRefs(rawAuth, secrets);

    // Resolve endpointRef/inputSchema from source endpoint for linked tools/resources
    const resolveToolRef = (tool: GeneratedTool): GeneratedTool => {
      if (!tool.endpointSource) return tool;
      const source = allTools.find((t) => t.name === tool.endpointSource);
      if (!source?.endpointRef) return tool;
      // inputSchema and outputSchema belong to the source endpoint, not to the linked tool
      return {
        ...tool,
        endpointRef: source.endpointRef,
        inputSchema: source.inputSchema,
        ...(source.outputSchema ? { outputSchema: source.outputSchema } : {}),
      };
    };
    const resolveResourceRef = (resource: McpResource): McpResource => {
      if (!resource.endpointSource) return resource;
      const source = allTools.find((t) => t.name === resource.endpointSource);
      if (!source?.endpointRef) return resource;
      return { ...resource, endpointRef: source.endpointRef };
    };

    const tools: GeneratedTool[] = allTools.filter((t) => t.enabled !== false).map(resolveToolRef);
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const enabledChains: ToolChain[] = allChains.filter((c) => c.enabled !== false);
    const chainMap = new Map(enabledChains.map((c) => [c.name, c]));
    const enabledResources = resources.filter((r) => r.enabled !== false);

    this.logger.log(`MCP server para "${name}": ${tools.length} tools (${allTools.length} total, ${allTools.filter(t => t.enabled === false).length} disabled)`);

    const server = new Server(
      { name: `arthur-mcp-adapter:${name}`, version },
      { capabilities: { tools: {}, resources: {}, prompts: {} } },
    );

    // Build a set of toolParamNames that are managed by multi-tenant injection
    const tenantToolParamNames = new Set<string>();
    if (tenantConfig.enabled) {
      for (const def of tenantConfig.params) {
        for (const tool of tools) {
          const mapping = tool.endpointRef?.parameterMap.find((m) => m.originalName === def.name);
          if (mapping) tenantToolParamNames.add(mapping.toolParamName);
        }
      }
    }

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...tools.map((t) => {
          const method = (t.endpointRef?.method ?? 'GET').toUpperCase();
          const readOnly = method === 'GET' || method === 'HEAD';
          const destructive = method === 'DELETE';

          // Strip tenant-injected params from the schema exposed to the AI
          const tenantKeysForTool = new Set(
            (t.endpointRef?.parameterMap ?? [])
              .filter((m) => tenantToolParamNames.has(m.toolParamName))
              .map((m) => m.toolParamName),
          );
          const allProps = t.inputSchema.properties ?? {};
          const filteredProps = Object.fromEntries(
            Object.entries(allProps).filter(([k]) => !tenantKeysForTool.has(k)),
          );
          const filteredRequired = (t.inputSchema.required ?? []).filter(
            (k) => !tenantKeysForTool.has(k),
          );

          return {
            name: t.name,
            description: t.description,
            inputSchema: {
              type: 'object' as const,
              properties: filteredProps,
              ...(filteredRequired.length > 0 ? { required: filteredRequired } : {}),
            },
            ...(t.outputSchema ? { outputSchema: t.outputSchema } : {}),
            annotations: {
              readOnlyHint: readOnly,
              destructiveHint: destructive,
              openWorldHint: true,
            },
          };
        }),
        ...enabledChains.map((c) => ({
          name: c.name,
          description: c.description ?? '',
          inputSchema: {
            type: 'object' as const,
            properties: c.inputSchema.properties ?? {},
            ...(c.inputSchema.required ? { required: c.inputSchema.required } : {}),
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: true,
          },
        })),
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (req): Promise<any> => {
      const args = (req.params.arguments ?? {}) as Record<string, unknown>;
      const toolName = req.params.name;
      const tool = toolMap.get(toolName);
      const t0 = Date.now();

      this.logger.log(`CallTool → "${toolName}" | args: ${JSON.stringify(args)}`);

      // Check if it's a chain
      const chain = chainMap.get(toolName);
      if (chain) {
        try {
          const result = await this.executeChain(chain, args, tools, auth, globalRequestHeaders);
          this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', statusCode: result.isError ? 500 : 200, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
          return result;
        } catch (err: any) {
          this.logger.error(`Chain "${toolName}" error: ${err?.message}`);
          this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
          return { content: [{ type: 'text' as const, text: `Chain error: ${err?.message ?? 'unknown'}` }], isError: true };
        }
      }

      if (!tool) {
        this.logger.warn(`Tool not found: "${toolName}" | available: [${[...toolMap.keys()].join(', ')}]`);
        this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 404, errorMessage: 'Tool not found', responseTimeMs: Date.now() - t0 });
        return { content: [{ type: 'text' as const, text: `Unknown tool: ${toolName}` }], isError: true };
      }

      if (!tool.endpointRef) {
        this.logger.error(`Tool "${toolName}" has no endpointRef — data may be stale. Re-upload the spec.`);
        this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: 'endpointRef missing', responseTimeMs: Date.now() - t0 });
        return { content: [{ type: 'text' as const, text: `Invalid internal configuration for "${toolName}". Re-upload the spec.` }], isError: true };
      }

      const validationErrors = validateToolArgs(args, tool.inputSchema);
      if (validationErrors.length > 0) {
        const msg = `Invalid arguments: ${validationErrors.join('; ')}`;
        this.logger.warn(`Tool "${toolName}" — ${msg}`);
        this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 400, errorMessage: msg, responseTimeMs: Date.now() - t0 });
        return { content: [{ type: 'text' as const, text: msg }], isError: true };
      }

      // Validate required tenant params before executing
      if (tenantConfig.enabled) {
        const missingRequired = tenantConfig.params
          .filter((def) => def.required && queryParams[def.name] === undefined)
          .map((def) => def.name);
        if (missingRequired.length > 0) {
          const msg = `Missing required tenant parameter`;
          this.logger.warn(`Tool "${toolName}" — ${msg}`);
          this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 400, errorMessage: msg, responseTimeMs: Date.now() - t0 });
          return { content: [{ type: 'text' as const, text: msg }], isError: true };
        }
      }

      try {
        const effectiveArgs = this.injectTenantParams(args, tool, tenantConfig, queryParams);
        let httpReq = buildRequest(effectiveArgs, tool.endpointRef, globalRequestHeaders);
        httpReq = await applyAuth(httpReq, auth);
        this.logger.log(`→ HTTP ${httpReq.method} ${httpReq.url}`);
        const httpRes = await executeRequest(httpReq);
        this.logger.log(`← HTTP ${httpRes.status} ${httpRes.statusText}`);
        // If the tool has an HTML output template, render with Handlebars instead of raw JSON
        if (tool.outputTemplate && !httpRes.body.trim().startsWith('<')) {
          try {
            const parsed = JSON.parse(httpRes.body);
            const ctx = Array.isArray(parsed) ? { items: parsed } : parsed;
            const html = compileAndRender(tool.outputTemplate, ctx);
            this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: false });
            return { content: [{ type: 'text' as const, text: html }] };
          } catch (tplErr: any) {
            this.logger.warn(`Template render failed for "${toolName}": ${tplErr?.message}`);
          }
        }

        const result = mapResponse(httpRes);
        this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });

        // If the tool declares an outputSchema, also populate structuredContent
        if (tool.outputSchema && !result.isError) {
          const rawText = (result as any).content?.[0]?.text;
          if (rawText) {
            try {
              const parsed = JSON.parse(rawText);
              return { ...result, structuredContent: parsed };
            } catch { /* non-JSON response — structuredContent omitted */ }
          }
        }

        return result;
      } catch (err: any) {
        this.logger.error(`Erro ao executar "${toolName}": ${err?.message}`);
        this.executionLogs.log({ serverId, serverName: name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
        const errMsg = err?.message ?? 'unknown error';
        const errText = tool.errorConfig?.message
          ? tool.errorConfig.message.replace('{{error}}', errMsg)
          : `Error: ${errMsg}`;
        return { content: [{ type: 'text' as const, text: errText }], isError: true };
      }
    });

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: enabledResources.map((r) => ({
        uri: r.uri,
        name: r.name,
        ...(r.description ? { description: r.description } : {}),
        ...(r.mimeType ? { mimeType: r.mimeType } : {}),
      })),
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
      const uri = req.params.uri;
      const raw = enabledResources.find((r) => r.uri === uri);
      if (!raw) throw new Error(`Resource not found: ${uri}`);
      const resource = resolveResourceRef(raw);

      if (resource.type !== 'dynamic' || !resource.endpointRef) {
        return { contents: [{ uri, text: resource.content, ...(resource.mimeType ? { mimeType: resource.mimeType } : {}) }] };
      }

      try {
        let httpReq = buildRequest(resource.inputDefaults ?? {}, resource.endpointRef, globalRequestHeaders);
        httpReq = await applyAuth(httpReq, auth);
        const httpRes = await executeRequest(httpReq);
        if (httpRes.status >= 400) throw new Error(`HTTP ${httpRes.status}: ${httpRes.body.slice(0, 200)}`);
        const parsed = JSON.parse(httpRes.body);
        const rendered = compileAndRender(resource.content, parsed);
        return { contents: [{ uri, text: rendered, mimeType: resource.mimeType ?? 'text/html' }] };
      } catch (err: any) {
        const errorMsg = err?.message ?? 'unknown error';
        const msg = (resource.errorConfig?.message ?? 'Error loading resource: {{error}}').replace('{{error}}', errorMsg);
        return { contents: [{ uri, text: msg, mimeType: 'text/plain' }] };
      }
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: prompts.map((p) => {
        const argNames = [...new Set([...p.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
        return {
          name: p.name,
          ...(p.description ? { description: p.description } : {}),
          ...(argNames.length ? { arguments: argNames.map((name) => ({ name, required: false })) } : {}),
        };
      }),
    }));

    server.setRequestHandler(GetPromptRequestSchema, async (req) => {
      const { name, arguments: args = {} } = req.params as { name: string; arguments?: Record<string, string> };
      const prompt = prompts.find((p) => p.name === name);
      if (!prompt) throw new Error(`Prompt not found: ${name}`);

      const text = prompt.content.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => String((args as Record<string, string>)[key] ?? `{{${key}}}`),
      );

      return {
        messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
      };
    });

    return server;
  }

  private async executeChain(
    chain: ToolChain,
    chainArgs: Record<string, unknown>,
    tools: GeneratedTool[],
    auth: AuthConfig,
    globalRequestHeaders: Record<string, string> = {},
  ): Promise<McpToolResult> {
    const stepOutputs = new Map<string, unknown>();

    const resolveInput = (input: ChainInputSource, stepId: string): unknown => {
      if (input.source === 'literal') return input.value;
      if (input.source === 'chain_input') return chainArgs[input.paramName];
      // step_output
      const out = stepOutputs.get(input.stepId);
      return input.jsonPath ? getByPath(out, input.jsonPath) : out;
    };

    for (const step of chain.steps) {
      const tool = tools.find((t) => t.name === step.toolName);
      if (!tool) {
        return { content: [{ type: 'text' as const, text: `Chain step error: tool "${step.toolName}" not found` }], isError: true };
      }

      const stepArgs: Record<string, unknown> = {};
      for (const mapping of step.inputMapping) {
        stepArgs[mapping.paramName] = resolveInput(mapping.input, step.id);
      }

      try {
        let httpReq = buildRequest(stepArgs, tool.endpointRef, globalRequestHeaders);
        httpReq = await applyAuth(httpReq, auth);
        const httpRes = await executeRequest(httpReq);

        if (httpRes.status >= 400) {
          return { content: [{ type: 'text' as const, text: `Chain step "${step.toolName}" failed: HTTP ${httpRes.status} — ${httpRes.body.slice(0, 200)}` }], isError: true };
        }

        try {
          stepOutputs.set(step.id, JSON.parse(httpRes.body));
        } catch {
          stepOutputs.set(step.id, httpRes.body);
        }
      } catch (err: any) {
        return { content: [{ type: 'text' as const, text: `Chain step "${step.toolName}" error: ${err?.message}` }], isError: true };
      }
    }

    const lastStep = chain.steps[chain.steps.length - 1];
    const lastOutput = lastStep ? stepOutputs.get(lastStep.id) : undefined;
    const resultText = typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput, null, 2);
    return { content: [{ type: 'text' as const, text: resultText ?? '' }] };
  }

  async executeTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolResult> {
    const { tools: allTools, auth: rawAuth, name, secrets, globalRequestHeaders } = await this.getProjectData(serverId);
    const auth = resolveSecretRefs(rawAuth, secrets);

    const rawTool = allTools.find((t) => t.name === toolName);
    if (!rawTool || rawTool.enabled === false) throw new NotFoundException(`Tool "${toolName}" not found.`);
    // Resolve endpointRef from source endpoint if this tool references one
    const sourceEndpoint = rawTool.endpointSource ? allTools.find((t) => t.name === rawTool.endpointSource) : undefined;
    const tool = sourceEndpoint?.endpointRef
      ? { ...rawTool, endpointRef: sourceEndpoint.endpointRef, inputSchema: sourceEndpoint.inputSchema }
      : rawTool;

    const t0 = Date.now();

    const validationErrors = validateToolArgs(args, tool.inputSchema);
    if (validationErrors.length > 0) {
      const msg = `Invalid arguments: ${validationErrors.join('; ')}`;
      this.executionLogs.log({ serverId, serverName: name, toolName, source: 'direct', isError: true, statusCode: 400, errorMessage: msg, responseTimeMs: 0 });
      return { content: [{ type: 'text', text: msg }], isError: true };
    }

    try {
      let httpReq = buildRequest(args, tool.endpointRef, globalRequestHeaders);
      httpReq = await applyAuth(httpReq, auth);
      const httpRes = await executeRequest(httpReq);
      const result = mapResponse(httpRes);
      this.executionLogs.log({ serverId, serverName: name, toolName, source: 'direct', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
      return result;
    } catch (err: any) {
      this.logger.error(`Erro ao executar ${toolName}: ${err?.message}`);
      this.executionLogs.log({ serverId, serverName: name, toolName, source: 'direct', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
      const errorMsg = err?.message ?? 'unknown error';
      const msg = rawTool.errorConfig?.message
        ? rawTool.errorConfig.message.replace('{{error}}', errorMsg)
        : `Error: ${errorMsg}`;
      return { content: [{ type: 'text', text: msg }], isError: true };
    }
  }
}
