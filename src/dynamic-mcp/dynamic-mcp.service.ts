import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SwaggerProject,
  SwaggerProjectDocument,
} from '../swagger/swagger-project.schema';
import type { AuthConfig, GeneratedTool, JsonSchema } from './types';
import { buildRequest } from './request-builder';
import { executeRequest } from './http-client';
import { mapResponse, McpToolResult } from './response-mapper';
import { applyAuth } from './auth-provider';
import { ExecutionLogsService } from '../execution-logs/execution-logs.service';

interface CachedProject {
  tools: GeneratedTool[];
  auth: AuthConfig;
  name: string;
  version: string;
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

@Injectable()
export class DynamicMcpService {
  private readonly logger = new Logger(DynamicMcpService.name);
  private readonly projectCache = new Map<string, CachedProject>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
    private readonly executionLogs: ExecutionLogsService,
  ) {}

  invalidate(projectId: string): void {
    this.projectCache.delete(projectId);
  }

  private async getProjectData(projectId: string): Promise<CachedProject> {
    const cached = this.projectCache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException(`Projeto ${projectId} não encontrado.`);

    const entry: CachedProject = {
      tools: project.tools ?? [],
      auth: project.auth ?? { type: 'none' },
      name: project.name,
      version: project.version ?? '1.0.0',
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
    this.projectCache.set(projectId, entry);
    return entry;
  }

  async createMcpServer(projectId: string): Promise<Server> {
    const { tools: allTools, auth, name, version } = await this.getProjectData(projectId);

    const tools: GeneratedTool[] = allTools.filter((t) => t.enabled !== false);
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    this.logger.log(`MCP server para "${name}": ${tools.length} tools (${allTools.length} total, ${allTools.filter(t => t.enabled === false).length} disabled)`);

    const server = new Server(
      { name: `arthur-mcp-adapter:${name}`, version },
      { capabilities: { tools: {} } },
    );

    // ListTools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object' as const,
          properties: t.inputSchema.properties ?? {},
          ...(t.inputSchema.required ? { required: t.inputSchema.required } : {}),
        },
      })),
    }));

    // CallTool
    server.setRequestHandler(CallToolRequestSchema, async (req): Promise<any> => {
      const args = (req.params.arguments ?? {}) as Record<string, unknown>;
      const toolName = req.params.name;
      const tool = toolMap.get(toolName);
      const t0 = Date.now();

      this.logger.log(`CallTool → "${toolName}" | args: ${JSON.stringify(args)}`);

      if (!tool) {
        this.logger.warn(`Tool não encontrada: "${toolName}" | disponíveis: [${[...toolMap.keys()].join(', ')}]`);
        this.executionLogs.log({ projectId, projectName: name, toolName, source: 'mcp', isError: true, statusCode: 404, errorMessage: 'Tool não encontrada', responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Tool desconhecida: ${toolName}` }],
          isError: true,
        };
      }

      if (!tool.endpointRef) {
        this.logger.error(`Tool "${toolName}" não possui endpointRef — dados podem estar desatualizados. Re-faça o upload.`);
        this.executionLogs.log({ projectId, projectName: name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: 'endpointRef ausente', responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Configuração interna inválida para "${toolName}". Re-faça o upload do spec.` }],
          isError: true,
        };
      }

      const validationErrors = validateToolArgs(args, tool.inputSchema);
      if (validationErrors.length > 0) {
        const msg = `Invalid arguments: ${validationErrors.join('; ')}`;
        this.logger.warn(`Tool "${toolName}" — ${msg}`);
        this.executionLogs.log({ projectId, projectName: name, toolName, source: 'mcp', isError: true, statusCode: 400, errorMessage: msg, responseTimeMs: Date.now() - t0 });
        return { content: [{ type: 'text' as const, text: msg }], isError: true };
      }

      try {
        let httpReq = buildRequest(args, tool.endpointRef);
        httpReq = await applyAuth(httpReq, auth);

        this.logger.log(`→ HTTP ${httpReq.method} ${httpReq.url}`);

        const httpRes = await executeRequest(httpReq);

        this.logger.log(`← HTTP ${httpRes.status} ${httpRes.statusText}`);

        const result = mapResponse(httpRes);
        this.executionLogs.log({ projectId, projectName: name, toolName, source: 'mcp', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
        return result;
      } catch (err: any) {
        this.logger.error(`Erro ao executar "${toolName}": ${err?.message}`);
        this.executionLogs.log({ projectId, projectName: name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Erro: ${err?.message ?? 'Erro desconhecido'}` }],
          isError: true,
        };
      }
    });

    return server;
  }

  /**
   * Executa uma tool diretamente — sem protocolo MCP.
   * Usado pelo endpoint REST de teste no frontend.
   */
  async executeTool(
    projectId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolResult> {
    const { tools: allTools, auth, name } = await this.getProjectData(projectId);

    const tool = allTools.find((t) => t.name === toolName);
    if (!tool) throw new NotFoundException(`Ferramenta "${toolName}" não encontrada.`);

    const t0 = Date.now();

    const validationErrors = validateToolArgs(args, tool.inputSchema);
    if (validationErrors.length > 0) {
      const msg = `Invalid arguments: ${validationErrors.join('; ')}`;
      this.executionLogs.log({ projectId, projectName: name, toolName, source: 'direct', isError: true, statusCode: 400, errorMessage: msg, responseTimeMs: 0 });
      return { content: [{ type: 'text', text: msg }], isError: true };
    }

    try {
      let httpReq = buildRequest(args, tool.endpointRef);
      httpReq = await applyAuth(httpReq, auth);
      const httpRes = await executeRequest(httpReq);
      const result = mapResponse(httpRes);
      this.executionLogs.log({ projectId, projectName: name, toolName, source: 'direct', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
      return result;
    } catch (err: any) {
      this.logger.error(`Erro ao executar ${toolName}: ${err?.message}`);
      this.executionLogs.log({ projectId, projectName: name, toolName, source: 'direct', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
      return {
        content: [{ type: 'text', text: `Erro: ${err?.message ?? 'Erro desconhecido'}` }],
        isError: true,
      };
    }
  }
}
