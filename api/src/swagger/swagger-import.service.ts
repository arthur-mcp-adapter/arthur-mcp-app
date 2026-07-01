import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as yaml from 'js-yaml';
import { PROJECT_REPO } from '../database/database.tokens';
import { DynamicMcpService } from '../dynamic-mcp/dynamic-mcp.service';
import { generateTools } from '../dynamic-mcp/tool-generator';
import { parseSpec } from '../dynamic-mcp/openapi-parser';
import type { AuthConfig } from '../dynamic-mcp/types';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from './swagger-project.repository';
import { parsePostmanCollection } from './postman-parser';
import { uniqueShareSlug } from './share-slug.util';

const SPEC_PATHS = [
  '/openapi.json', '/openapi.yaml', '/openapi.yml',
  '/swagger.json', '/swagger.yaml',
  '/api-docs', '/api-docs.json', '/api-docs.yaml',
  '/swagger/v2/api-docs', '/v2/api-docs',
  '/docs/api.json', '/api/openapi.json', '/api/swagger.json',
];

@Injectable()
export class SwaggerImportService {
  private readonly logger = new Logger(SwaggerImportService.name);

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
      throw new BadRequestException('Failed to parse file. Make sure it is valid JSON or YAML.');
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

  async previewSpec(content: string, filename: string, baseUrlOverride?: string) {
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);
    const normalizedSpec = await this.normalizeSpec(rawSpec);
    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    return {
      name: normalizedSpec.info.title,
      version: normalizedSpec.info.version,
      description: normalizedSpec.info.description,
      resolvedBaseUrl: baseUrl,
      totalTools: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        method: tool.endpointRef.method,
        path: tool.endpointRef.path,
      })),
    };
  }

  async create(content: string, filename: string, baseUrlOverride?: string, auth?: AuthConfig): Promise<SwaggerProjectRecord> {
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);
    const normalizedSpec = await this.normalizeSpec(rawSpec);
    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    this.logger.log(`Project "${normalizedSpec.info.title}" imported: ${tools.length} tools generated`);

    const name = normalizedSpec.info.title ?? filename.replace(/\.(ya?ml|json)$/i, '');

    return this.projectRepo.create({
      name,
      shareSlug: uniqueShareSlug(name, await this.projectRepo.findAll()),
      baseUrl,
      description: normalizedSpec.info.description,
      version: normalizedSpec.info.version,
      rawSpec,
      tools,
      auth: auth ?? { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      resources: [],
      prompts: [],
      chains: [],
      tags: [],
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
    });
  }

  async reimportSpec(id: string, content: string, filename: string, baseUrlOverride?: string): Promise<{ added: number; updated: number; baseUrl: string }> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);
    const normalizedSpec = await this.normalizeSpec(rawSpec);
    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || server.baseUrl;
    const newTools = generateTools(normalizedSpec, baseUrl);

    let added = 0;
    let updated = 0;

    for (const newTool of newTools) {
      const existingIdx = server.tools.findIndex((tool) => tool.name === newTool.name);
      if (existingIdx === -1) {
        server.tools.push(newTool);
        added++;
      } else {
        (server.tools[existingIdx] as any).inputSchema = newTool.inputSchema;
        (server.tools[existingIdx] as any).endpointRef = newTool.endpointRef;
        updated++;
      }
    }

    server.rawSpec = rawSpec;
    server.baseUrl = baseUrl;
    await this.projectRepo.save(server);
    this.dynamicMcp.invalidate(id);

    this.logger.log(`Re-import "${server.name}": +${added} added, ${updated} updated`);
    return { added, updated, baseUrl };
  }

  async fromPostman(content: string, baseUrlOverride?: string): Promise<SwaggerProjectRecord> {
    const openApiSpec = this.parsePostman(content);
    const base = baseUrlOverride?.trim() || openApiSpec.servers?.[0]?.url || 'http://localhost';
    const normalizedSpec = await parseSpec(openApiSpec);
    const tools = generateTools(normalizedSpec, base);

    const name = openApiSpec.info.title ?? 'Imported from Postman';

    return this.projectRepo.create({
      name,
      shareSlug: uniqueShareSlug(name, await this.projectRepo.findAll()),
      baseUrl: base,
      description: openApiSpec.info.description,
      tools,
      auth: { type: 'none' },
      status: 'active',
      mcpApiKeys: [],
      resources: [],
      prompts: [],
      chains: [],
      tags: [],
      rateLimit: { enabled: false, requestsPerMinute: 60 },
      isPaused: false,
      maintenanceMode: { enabled: false, message: '' },
      availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
    });
  }

  async previewPostman(content: string, baseUrlOverride?: string) {
    const openApiSpec = this.parsePostman(content);
    const base = baseUrlOverride?.trim() || openApiSpec.servers?.[0]?.url || 'http://localhost';
    const normalizedSpec = await parseSpec(openApiSpec);
    const tools = generateTools(normalizedSpec, base);

    return {
      name: openApiSpec.info.title ?? 'Postman Collection',
      resolvedBaseUrl: base,
      totalTools: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        method: tool.endpointRef.method,
        path: tool.endpointRef.path,
      })),
    };
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

  async testConnection(baseUrl: string, auth?: AuthConfig): Promise<{ success: boolean; statusCode?: number; message: string; responseTimeMs: number }> {
    const t0 = Date.now();
    const headers: Record<string, string> = {};

    if (auth) {
      if (auth.type === 'bearer') headers.Authorization = `Bearer ${auth.token}`;
      else if (auth.type === 'api-key' && auth.in === 'header') headers[auth.name] = auth.value;
      else if (auth.type === 'basic') {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers.Authorization = `Basic ${encoded}`;
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

  private async normalizeSpec(rawSpec: Record<string, any>) {
    try {
      return await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Error processing the spec: ${err?.message ?? err}`);
    }
  }

  private parsePostman(content: string): Record<string, any> {
    try {
      return parsePostmanCollection(content);
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Failed to parse Postman collection.');
    }
  }
}
