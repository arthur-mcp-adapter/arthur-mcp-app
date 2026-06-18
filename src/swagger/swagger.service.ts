import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { parseSpec } from '../dynamic-mcp/openapi-parser';
import { generateTools } from '../dynamic-mcp/tool-generator';
import { DynamicMcpService } from '../dynamic-mcp/dynamic-mcp.service';
import type { AuthConfig, ToolComment } from '../dynamic-mcp/types';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository, McpApiKeyEntry, SwaggerProjectRecord } from './swagger-project.repository';
import { parsePostmanCollection } from './postman-parser';

const SHARE_SECRET = process.env.JWT_SECRET ?? 'mcp-share-secret';
const SPEC_PATHS = [
  '/openapi.json', '/openapi.yaml', '/openapi.yml',
  '/swagger.json', '/swagger.yaml',
  '/api-docs', '/api-docs.json', '/api-docs.yaml',
  '/swagger/v2/api-docs', '/v2/api-docs',
  '/docs/api.json', '/api/openapi.json', '/api/swagger.json',
];

@Injectable()
export class SwaggerService {
  private readonly logger = new Logger(SwaggerService.name);

  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    private readonly dynamicMcp: DynamicMcpService,
  ) {}

  private parseContent(content: string, filename: string): Record<string, any> {
    try {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
        return yaml.load(content) as Record<string, any>;
      }
      return JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Não foi possível fazer o parse do arquivo. Verifique se é um JSON ou YAML válido.',
      );
    }
  }

  private validateSpec(spec: Record<string, any>): void {
    const isSwagger2 = spec.swagger === '2.0';
    const isOpenApi3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3.');
    if (!isSwagger2 && !isOpenApi3) {
      throw new BadRequestException('Arquivo inválido: deve ser Swagger 2.0 ou OpenAPI 3.x.');
    }
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      throw new BadRequestException('Arquivo inválido: nenhum endpoint (paths) encontrado.');
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
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    return {
      name: normalizedSpec.info.title,
      version: normalizedSpec.info.version,
      description: normalizedSpec.info.description,
      resolvedBaseUrl: baseUrl,
      totalTools: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        method: t.endpointRef.method,
        path: t.endpointRef.path,
      })),
    };
  }

  async create(
    content: string,
    filename: string,
    baseUrlOverride?: string,
    auth?: AuthConfig,
  ): Promise<SwaggerProjectRecord> {
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    this.logger.log(`Projeto "${normalizedSpec.info.title}" importado: ${tools.length} tools geradas`);

    return this.projectRepo.create({
      name: normalizedSpec.info.title ?? filename.replace(/\.(ya?ml|json)$/i, ''),
      baseUrl,
      description: normalizedSpec.info.description,
      version: normalizedSpec.info.version,
      rawSpec,
      tools,
      auth: auth ?? { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      tags: [],
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
    });
  }

  findAll(tags?: string[]): Promise<SwaggerProjectRecord[]> {
    return this.projectRepo.findAll(tags?.length ? { tags } : undefined);
  }

  async updateTags(id: string, tags: string[]): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, { tags: tags.map((t) => t.trim()).filter(Boolean) });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async updateRateLimit(
    id: string,
    dto: { enabled: boolean; requestsPerMinute: number },
  ): Promise<SwaggerProjectRecord> {
    if (dto.requestsPerMinute < 1 || dto.requestsPerMinute > 10_000) {
      throw new BadRequestException('requestsPerMinute deve estar entre 1 e 10000.');
    }
    const project = await this.projectRepo.update(id, { rateLimit: dto });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async duplicate(id: string): Promise<SwaggerProjectRecord> {
    const source = await this.projectRepo.findById(id);
    if (!source) throw new NotFoundException('Projeto não encontrado.');

    const { _id, createdAt, updatedAt, mcpApiKey, mcpApiKeys, ...rest } = source;
    return this.projectRepo.create({
      ...rest,
      name: `${source.name} (cópia)`,
      mcpApiKeys: [],
    });
  }

  async findOne(id: string): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.projectRepo.delete(id);
    if (!deleted) throw new NotFoundException('Projeto não encontrado.');
    this.dynamicMcp.invalidate(id);
  }

  async generateApiKey(id: string): Promise<{ mcpApiKey: string }> {
    const key = crypto.randomBytes(32).toString('hex');
    const project = await this.projectRepo.update(id, { mcpApiKey: key });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return { mcpApiKey: key };
  }

  async revokeApiKey(id: string): Promise<void> {
    const project = await this.projectRepo.update(id, { mcpApiKey: null });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
  }

  async addApiKey(id: string, name: string): Promise<McpApiKeyEntry> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const entry: McpApiKeyEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      key: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
    };

    project.mcpApiKeys.push(entry);
    await this.projectRepo.save(project);
    return entry;
  }

  async removeApiKey(id: string, keyId: string): Promise<void> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.mcpApiKeys.findIndex((k) => k.id === keyId);
    if (idx === -1) throw new NotFoundException('Key não encontrada.');

    project.mcpApiKeys.splice(idx, 1);
    await this.projectRepo.save(project);
  }

  async reimportSpec(
    id: string,
    content: string,
    filename: string,
    baseUrlOverride?: string,
  ): Promise<{ added: number; updated: number; baseUrl: string }> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || project.baseUrl;
    const newTools = generateTools(normalizedSpec, baseUrl);

    let added = 0;
    let updated = 0;

    for (const newTool of newTools) {
      const existingIdx = project.tools.findIndex((t) => t.name === newTool.name);
      if (existingIdx === -1) {
        project.tools.push(newTool);
        added++;
      } else {
        (project.tools[existingIdx] as any).inputSchema = newTool.inputSchema;
        (project.tools[existingIdx] as any).endpointRef = newTool.endpointRef;
        updated++;
      }
    }

    project.rawSpec = rawSpec;
    project.baseUrl = baseUrl;
    await this.projectRepo.save(project);
    this.dynamicMcp.invalidate(id);

    this.logger.log(`Re-import "${project.name}": +${added} adicionadas, ${updated} atualizadas`);
    return { added, updated, baseUrl };
  }

  async createEmpty(dto: { name: string; description?: string; baseUrl: string }): Promise<SwaggerProjectRecord> {
    return this.projectRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      baseUrl: dto.baseUrl.trim(),
      tools: [],
      auth: { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      tags: [],
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
    });
  }

  async updateAuth(id: string, auth: AuthConfig): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, { auth });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.dynamicMcp.invalidate(id);
    return project;
  }

  async updateInfo(id: string, dto: { name?: string; description?: string }): Promise<SwaggerProjectRecord> {
    const updates: Partial<SwaggerProjectRecord> = {};
    if (dto.name?.trim()) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description.trim() || undefined;

    const project = await this.projectRepo.update(id, updates);
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async updateToolMeta(
    id: string,
    currentName: string,
    dto: { name?: string; description?: string; enabled?: boolean },
  ): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const tool = project.tools.find((t) => t.name === currentName) as any;
    if (!tool) throw new NotFoundException(`Tool "${currentName}" não encontrada.`);

    if (dto.name?.trim()) tool.name = dto.name.trim();
    if (dto.description !== undefined) tool.description = dto.description.trim() || undefined;
    if (typeof dto.enabled === 'boolean') tool.enabled = dto.enabled;

    const saved = await this.projectRepo.save(project);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async removeTool(id: string, toolName: string): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.tools.findIndex((t) => t.name === toolName);
    if (idx === -1) throw new NotFoundException(`Tool "${toolName}" não encontrada.`);

    project.tools.splice(idx, 1);
    const saved = await this.projectRepo.save(project);
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
    },
  ): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.tools.findIndex((t) => t.name === currentName);
    if (idx === -1) throw new NotFoundException(`Tool "${currentName}" não encontrada.`);

    (project.tools as any)[idx] = {
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema,
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap,
      },
    };

    const saved = await this.projectRepo.save(project);
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
    },
  ): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const nameClean = dto.name.trim();
    if (project.tools.find((t) => t.name === nameClean)) {
      throw new BadRequestException(`Já existe uma ferramenta com o nome "${nameClean}".`);
    }

    project.tools.push({
      name: nameClean,
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema as any,
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap as any,
      },
    } as any);

    const saved = await this.projectRepo.save(project);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async updateBaseUrl(id: string, baseUrl: string): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    project.baseUrl = baseUrl;
    project.tools = project.tools.map((t) => ({
      ...t,
      endpointRef: t.endpointRef ? { ...t.endpointRef, baseUrl } : t.endpointRef,
    })) as typeof project.tools;

    const saved = await this.projectRepo.save(project);
    this.dynamicMcp.invalidate(id);
    return saved;
  }

  async setPaused(id: string, isPaused: boolean): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, { isPaused });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async setMaintenanceMode(id: string, dto: { enabled: boolean; message?: string }): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, {
      maintenanceMode: { enabled: dto.enabled, message: dto.message ?? '' },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async setAvailabilityWindow(
    id: string,
    dto: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> },
  ): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, { availabilityWindow: dto });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async setAlertConfig(
    id: string,
    dto: { enabled: boolean; errorThresholdPct: number; notifyEmail: string },
  ): Promise<SwaggerProjectRecord> {
    const project = await this.projectRepo.update(id, { alertConfig: dto });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async addToolComment(id: string, toolName: string, text: string, author: string): Promise<ToolComment> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Project not found.');
    const tool = project.tools.find((t) => t.name === toolName) as any;
    if (!tool) throw new NotFoundException(`Tool "${toolName}" not found.`);

    const comment: ToolComment = { id: crypto.randomUUID(), text: text.trim(), author, createdAt: new Date() };
    if (!tool.comments) tool.comments = [];
    tool.comments.push(comment);
    await this.projectRepo.save(project);
    return comment;
  }

  async deleteToolComment(id: string, toolName: string, commentId: string): Promise<void> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundException('Project not found.');
    const tool = project.tools.find((t) => t.name === toolName) as any;
    if (!tool) throw new NotFoundException(`Tool "${toolName}" not found.`);
    tool.comments = (tool.comments ?? []).filter((c: ToolComment) => c.id !== commentId);
    await this.projectRepo.save(project);
  }

  async discoverSpec(baseUrl: string): Promise<{ found: boolean; specUrl?: string; paths: { url: string; status: number }[] }> {
    const base = baseUrl.replace(/\/$/, '');
    const results: { url: string; status: number }[] = [];

    for (const path of SPEC_PATHS) {
      const url = `${base}${path}`;
      try {
        const res = await axios.get(url, { timeout: 5000, validateStatus: () => true });
        results.push({ url, status: res.status });
        if (res.status === 200) {
          const data = res.data;
          const isSpec =
            (typeof data === 'object' && (data.openapi || data.swagger)) ||
            (typeof data === 'string' && (data.includes('openapi:') || data.includes('swagger:')));
          if (isSpec) return { found: true, specUrl: url, paths: results };
        }
      } catch {
        results.push({ url, status: 0 });
      }
    }
    return { found: false, paths: results };
  }

  async testConnection(
    baseUrl: string,
    auth?: AuthConfig,
  ): Promise<{ success: boolean; statusCode?: number; message: string; responseTimeMs: number }> {
    const t0 = Date.now();
    const headers: Record<string, string> = {};

    if (auth) {
      if (auth.type === 'bearer') headers['Authorization'] = `Bearer ${auth.token}`;
      else if (auth.type === 'api-key' && auth.in === 'header') headers[auth.name] = auth.value;
      else if (auth.type === 'basic') {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
    }

    try {
      const res = await axios.get(baseUrl.replace(/\/$/, ''), { headers, timeout: 8000, validateStatus: () => true });
      const ms = Date.now() - t0;
      const ok = res.status >= 200 && res.status < 500;
      return {
        success: ok,
        statusCode: res.status,
        responseTimeMs: ms,
        message: ok
          ? `Connected successfully — server responded with ${res.status} in ${ms}ms.`
          : `Server returned ${res.status}. Check your base URL and credentials.`,
      };
    } catch (err: any) {
      return {
        success: false,
        responseTimeMs: Date.now() - t0,
        message: `Could not reach the server: ${err?.message ?? 'Unknown error'}. Check the URL and that the API is accessible from this machine.`,
      };
    }
  }

  async fromPostman(content: string, baseUrlOverride?: string): Promise<SwaggerProjectRecord> {
    let openApiSpec: Record<string, any>;
    try {
      openApiSpec = parsePostmanCollection(content);
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Failed to parse Postman collection.');
    }

    const base = baseUrlOverride?.trim() || openApiSpec.servers?.[0]?.url || 'http://localhost';
    const normalizedSpec = await parseSpec(openApiSpec);
    const tools = generateTools(normalizedSpec, base);

    return this.projectRepo.create({
      name: openApiSpec.info.title ?? 'Imported from Postman',
      baseUrl: base,
      description: openApiSpec.info.description,
      tools,
      auth: { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      tags: [],
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
    });
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
    let openApiSpec: Record<string, any>;
    try {
      openApiSpec = parsePostmanCollection(content);
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Failed to parse Postman collection.');
    }

    const base = baseUrlOverride?.trim() || openApiSpec.servers?.[0]?.url || 'http://localhost';
    const normalizedSpec = await parseSpec(openApiSpec);
    const tools = generateTools(normalizedSpec, base);

    return {
      name: openApiSpec.info.title ?? 'Postman Collection',
      resolvedBaseUrl: base,
      totalTools: tools.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description, method: t.endpointRef.method, path: t.endpointRef.path })),
    };
  }

  async getHealthSummary(): Promise<{ projectId: string; errorRatePct: number; lastCallAt?: Date; totalCalls: number }[]> {
    const ids = await this.projectRepo.findAllIds();
    return ids.map((id) => ({ projectId: id, errorRatePct: 0, totalCalls: 0 }));
  }

  generateShareToken(projectId: string): string {
    return jwt.sign({ projectId, type: 'share' }, SHARE_SECRET, { expiresIn: '30d' });
  }

  async getProjectForShare(
    token: string,
  ): Promise<{ name: string; mcpUrl: string; hasKey: boolean; description?: string; toolCount: number }> {
    let payload: any;
    try {
      payload = jwt.verify(token, SHARE_SECRET);
    } catch {
      throw new BadRequestException('Invalid or expired share link.');
    }

    const project = await this.projectRepo.findById(payload.projectId);
    if (!project) throw new NotFoundException('Project not found.');

    return {
      name: project.name,
      description: project.description,
      mcpUrl: `/api/mcp/project/${project._id}`,
      hasKey: (project.mcpApiKeys?.length ?? 0) > 0 || !!project.mcpApiKey,
      toolCount: project.tools?.length ?? 0,
    };
  }
}
