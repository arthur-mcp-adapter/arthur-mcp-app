import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { SwaggerService } from './swagger.service';
import { PROJECT_REPO, PROMPT_REPO, SECRET_REPO } from '../database/database.tokens';
import { DynamicMcpService } from '../dynamic-mcp/dynamic-mcp.service';
import type { SwaggerProjectRecord } from './swagger-project.repository';
import { SwaggerApiKeysService } from './swagger-api-keys.service';
import { SwaggerImportService } from './swagger-import.service';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { ErrorTrackingService } from '../error-tracking/error-tracking.service';

const makeProject = (overrides: Partial<SwaggerProjectRecord> = {}): SwaggerProjectRecord => ({
  _id: 'proj-1',
  name: 'Test Project',
  baseUrl: 'https://api.example.com',
  tools: [],
  auth: { type: 'none' } as any,
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
  ...overrides,
});

const mockProjectRepo = {
  findById: jest.fn(),
  findByIdOrShareSlug: jest.fn(),
  findAll: jest.fn(),
  findAllIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};
const mockPromptRepo = {
  findById: jest.fn(),
};
const mockSecretRepo = { findAll: jest.fn() };

const mockDynamicMcp = {
  invalidate: jest.fn(),
};

const mockImportService = {};
const mockApiKeysService = {};
const mockJwtSecretService = { getSecret: jest.fn().mockResolvedValue('test-jwt-secret-value') };
const mockErrorTrackingService = { captureBackendError: jest.fn() };

describe('SwaggerService', () => {
  let service: SwaggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwaggerService,
        { provide: PROJECT_REPO, useValue: mockProjectRepo },
        { provide: PROMPT_REPO, useValue: mockPromptRepo },
        { provide: SECRET_REPO, useValue: mockSecretRepo },
        { provide: DynamicMcpService, useValue: mockDynamicMcp },
        { provide: SwaggerImportService, useValue: mockImportService },
        { provide: SwaggerApiKeysService, useValue: mockApiKeysService },
        { provide: JwtSecretService, useValue: mockJwtSecretService },
        { provide: ErrorTrackingService, useValue: mockErrorTrackingService },
      ],
    }).compile();

    service = module.get<SwaggerService>(SwaggerService);
    jest.clearAllMocks();
    mockJwtSecretService.getSecret.mockResolvedValue('test-jwt-secret-value');
    mockPromptRepo.findById.mockResolvedValue(null);
    mockSecretRepo.findAll.mockResolvedValue([]);
    mockProjectRepo.findAll.mockResolvedValue([]);
  });

  describe('updateOAuthClient', () => {
    it('persists an external OAuth provider and clears Arthur-managed credentials', async () => {
      const updated = makeProject({ oauthConfig: {
        mode: 'external',
        issuer: 'https://login.example.com',
        authorizationUrl: 'https://login.example.com/authorize',
        tokenUrl: 'https://login.example.com/token',
        jwksUrl: 'https://login.example.com/jwks',
        audience: 'https://mcp.example.com/orders',
        scopes: ['orders.read'],
      } });
      mockProjectRepo.update.mockResolvedValue(updated);

      const result = await service.updateOAuthClient('proj-1', {
        mode: 'external',
        oauthClientId: null,
        oauthClientSecret: null,
        issuer: 'https://login.example.com/',
        authorizationUrl: 'https://login.example.com/authorize',
        tokenUrl: 'https://login.example.com/token',
        jwksUrl: 'https://login.example.com/jwks',
        audience: 'https://mcp.example.com/orders',
        scopes: [' orders.read '],
      });

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', {
        oauthClientId: null,
        oauthClientSecret: null,
        oauthConfig: expect.objectContaining({
          mode: 'external',
          issuer: 'https://login.example.com/',
          scopes: ['orders.read'],
        }),
      });
      expect(result).toBe(updated);
    });

    it('requires an audience and either JWKS or introspection for external OAuth', async () => {
      await expect(service.updateOAuthClient('proj-1', {
        mode: 'external',
        oauthClientId: null,
        oauthClientSecret: null,
        issuer: 'https://login.example.com',
        authorizationUrl: 'https://login.example.com/authorize',
        tokenUrl: 'https://login.example.com/token',
        audience: '',
        scopes: [],
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProjectForShare', () => {
    it('generates and saves a unique human-readable slug for share links', async () => {
      mockProjectRepo.findById.mockResolvedValue(makeProject({ name: 'Payments API - São Paulo!' }));
      mockProjectRepo.findAll.mockResolvedValue([
        makeProject({ _id: 'proj-2', shareSlug: 'payments-api-sao-paulo' }),
      ]);
      mockProjectRepo.update.mockResolvedValue(makeProject({
        name: 'Payments API - São Paulo!',
        shareSlug: 'payments-api-sao-paulo-2',
      }));

      const result = await service.generateShareLink('proj-1');

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', { shareSlug: 'payments-api-sao-paulo-2' });
      expect(result.shareSlug).toBe('payments-api-sao-paulo-2');
      expect(result.url).toBe('/mcp-swagger/payments-api-sao-paulo-2');
    });

    it('keeps a manually edited slug when generating share links', async () => {
      mockProjectRepo.findById.mockResolvedValue(makeProject({ shareSlug: 'custom-docs' }));

      const result = await service.generateShareLink('proj-1');

      expect(mockProjectRepo.update).not.toHaveBeenCalled();
      expect(result.shareSlug).toBe('custom-docs');
      expect(result.url).toBe('/mcp-swagger/custom-docs');
    });

    it('rejects manual share slugs already used by another server', async () => {
      mockProjectRepo.findAll.mockResolvedValue([
        makeProject({ _id: 'proj-2', shareSlug: 'used-slug' }),
      ]);

      await expect(service.updateShareSlug('proj-1', 'used-slug')).rejects.toThrow(BadRequestException);
    });

    it('normalizes and saves a manually edited unique share slug', async () => {
      const updated = makeProject({ shareSlug: 'minha-api' });
      mockProjectRepo.update.mockResolvedValue(updated);

      const result = await service.updateShareSlug('proj-1', 'Minha API!');

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', { shareSlug: 'minha-api' });
      expect(result).toBe(updated);
    });

    it('creates empty servers with a unique generated share slug', async () => {
      mockProjectRepo.findAll.mockResolvedValue([
        makeProject({ _id: 'proj-2', shareSlug: 'test-project' }),
      ]);
      mockProjectRepo.create.mockImplementation(async (data: any) => makeProject({ _id: 'new-project', ...data }));

      const result = await service.createEmpty({ name: 'Test Project', baseUrl: 'https://api.example.com' }, 'owner-1');

      expect(mockProjectRepo.create).toHaveBeenCalledWith(expect.objectContaining({ shareSlug: 'test-project-2' }));
      expect(result.shareSlug).toBe('test-project-2');
    });

    it('returns public MCP server documentation without exposing credentials', async () => {
      const token = jwt.sign({ serverId: 'proj-1', type: 'share' }, 'test-jwt-secret-value');
      mockProjectRepo.findById.mockResolvedValue(makeProject({
        description: 'Shared API',
        version: '1.2.3',
        shareSlug: 'shared-api',
        tags: ['source:rest', 'billing'],
        auth: { type: 'api-key', name: 'x-api-key', value: 'secret-value', in: 'header' } as any,
        mcpApiKey: 'legacy-secret',
        oauthClientId: 'oauth-client-id',
        oauthClientSecret: 'oauth-client-secret',
        tools: [{
          name: 'list_invoices',
          description: 'List invoices [GET /v1/private-invoices]',
          inputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Invoice status', enum: ['open', 'paid'] },
            },
            required: ['status'],
          },
          outputSchema: { type: 'object' },
          endpointRef: {
            method: 'GET',
            path: '/v1/private-invoices',
            baseUrl: 'https://api.example.com',
            contentType: 'application/json',
            parameterMap: [{ toolParamName: 'status', source: 'query', originalName: 'status', required: false }],
          },
        }, {
          name: 'disabled_tool',
          description: 'Disabled tool',
          enabled: false,
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
        }],
        resources: [{
          id: 'res-1',
          name: 'Invoice docs',
          uri: 'resource://invoices',
          content: 'Invoice documentation',
          type: 'static',
        }, {
          id: 'res-2',
          name: 'Disabled docs',
          uri: 'resource://disabled',
          content: 'Disabled private docs',
          type: 'dynamic',
          enabled: false,
        }],
        prompts: [{ promptId: 'prompt-1', enabled: true }, { promptId: 'prompt-2', enabled: false }],
        dbQueries: [{
          id: 'op-1',
          name: 'Search invoices',
          sourceType: 'postgresql',
          query: 'select * from invoices',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'array' },
        } as any],
      }));
      mockPromptRepo.findById.mockResolvedValue({
        id: 'prompt-1',
        name: 'Summarize invoice',
        description: 'Creates a summary',
        content: 'Summarize {{invoiceId}}',
        tags: ['billing'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getProjectForShare(token);

      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(1);
      expect(result.prompts).toHaveLength(1);
      expect(result.hasOAuthClient).toBe(true);
      expect(result.oauthMode).toBe('managed');
      expect(result.shareSlug).toBe('shared-api');
      expect(result.mcpUrl).toBe('/api/mcp/server/shared-api');
      expect(result.prompts[0]).toEqual(expect.objectContaining({
        name: 'Summarize invoice',
        arguments: ['invoiceId'],
      }));
      expect(result.tools[0]).toEqual(expect.objectContaining({
        name: 'list_invoices',
        description: 'List invoices',
        parameters: [{
          name: 'status',
          type: 'string',
          description: 'Invoice status',
          required: true,
          enum: ['open', 'paid'],
        }],
        outputSchema: { type: 'object' },
      }));
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('secret-value');
      expect(serialized).not.toContain('legacy-secret');
      expect(serialized).not.toContain('oauth-client-id');
      expect(serialized).not.toContain('oauth-client-secret');
      expect(serialized).not.toContain('inputSchema');
      expect(serialized).not.toContain('https://api.example.com');
      expect(serialized).not.toContain('/v1/private-invoices');
      expect(serialized).not.toContain('GET');
      expect(serialized).not.toContain('[GET');
      expect(serialized).not.toContain('source:rest');
      expect(serialized).not.toContain('billing');
      expect(serialized).not.toContain('postgresql');
      expect(serialized).not.toContain('Search invoices');
      expect(serialized).not.toContain('Invoice documentation');
      expect(serialized).not.toContain('static');
      expect(serialized).not.toContain('dynamic');
      expect(serialized).not.toContain('disabled_tool');
      expect(serialized).not.toContain('Disabled docs');
      expect(serialized).not.toContain('prompt-2');
    });

    it('looks up the project by share slug for the permanent public link', async () => {
      mockProjectRepo.findByIdOrShareSlug.mockResolvedValue(makeProject({ shareSlug: 'shared-api' }));

      const result = await service.getProjectForShareBySlug('shared-api');

      expect(mockProjectRepo.findByIdOrShareSlug).toHaveBeenCalledWith('shared-api');
      expect(result.shareSlug).toBe('shared-api');
    });

    it('rejects an unknown share slug', async () => {
      mockProjectRepo.findByIdOrShareSlug.mockResolvedValue(null);

      await expect(service.getProjectForShareBySlug('missing-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('data-source operations', () => {
    it('creates a callable tool when an operation is added', async () => {
      const project = makeProject({ tools: [], dbQueries: [] });
      mockProjectRepo.findById.mockResolvedValue(project);
      mockProjectRepo.update.mockResolvedValue(project);

      const query = await service.addDbQuery('proj-1', {
        name: 'find_invoice',
        description: 'Find an invoice by id',
        sourceType: 'postgresql',
        query: 'select * from invoices where id = :id',
        parameters: [{ name: 'id', type: 'string', required: true }],
        outputSchema: { type: 'object' },
      });

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        dbQueries: [expect.objectContaining({ id: query.id, name: 'find_invoice' })],
        tools: [expect.objectContaining({
          name: 'find_invoice',
          inputSchema: expect.objectContaining({ required: ['id'] }),
          outputSchema: { type: 'object' },
          executionRef: { type: 'db', dbQueryId: query.id },
        })],
      }));
      expect(mockDynamicMcp.invalidate).toHaveBeenCalledWith('proj-1');
    });

    it('updates the generated tool while preserving its enabled state', async () => {
      const query = {
        id: 'query-1',
        name: 'old_name',
        sourceType: 'postgresql',
        query: 'select 1',
      } as any;
      mockProjectRepo.findById.mockResolvedValue(makeProject({
        dbQueries: [query],
        tools: [{
          name: 'old_name',
          description: '',
          inputSchema: { type: 'object' },
          executionRef: { type: 'db', dbQueryId: 'query-1' },
          enabled: false,
        }],
      }));

      await service.updateDbQuery('proj-1', 'query-1', { name: 'new_name' });

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        tools: [expect.objectContaining({
          name: 'new_name',
          enabled: false,
          executionRef: { type: 'db', dbQueryId: 'query-1' },
        })],
      }));
    });

    it('deletes only the tool generated for the removed operation', async () => {
      mockProjectRepo.findById.mockResolvedValue(makeProject({
        dbQueries: [{ id: 'query-1', name: 'find_invoice', sourceType: 'postgresql' } as any],
        tools: [
          { name: 'find_invoice', description: '', inputSchema: {}, executionRef: { type: 'db', dbQueryId: 'query-1' } },
          { name: 'http_tool', description: '', inputSchema: {}, endpointRef: { method: 'GET', path: '/', baseUrl: 'https://example.com', contentType: 'application/json', parameterMap: [] } },
        ],
      }));

      await service.deleteDbQuery('proj-1', 'query-1');

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', {
        dbQueries: [],
        tools: [expect.objectContaining({ name: 'http_tool' })],
      });
    });
  });
});
