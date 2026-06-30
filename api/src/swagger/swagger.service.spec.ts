import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { SwaggerService } from './swagger.service';
import { PROJECT_REPO, PROMPT_REPO } from '../database/database.tokens';
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
  });

  describe('updateRateLimit', () => {
    it('throws BadRequestException when requestsPerMinute is below 1', async () => {
      await expect(
        service.updateRateLimit('proj-1', { enabled: true, requestsPerMinute: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when requestsPerMinute exceeds 10000', async () => {
      await expect(
        service.updateRateLimit('proj-1', { enabled: true, requestsPerMinute: 10_001 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns updated project on valid input', async () => {
      const updated = makeProject({ rateLimit: { enabled: true, requestsPerMinute: 100 } });
      mockProjectRepo.update.mockResolvedValue(updated);

      const result = await service.updateRateLimit('proj-1', { enabled: true, requestsPerMinute: 100 });

      expect(mockProjectRepo.update).toHaveBeenCalledWith('proj-1', { rateLimit: { enabled: true, requestsPerMinute: 100 } });
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when project not found', async () => {
      mockProjectRepo.update.mockResolvedValue(null);
      await expect(
        service.updateRateLimit('missing', { enabled: false, requestsPerMinute: 60 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts boundary value 1 for requestsPerMinute', async () => {
      const updated = makeProject({ rateLimit: { enabled: true, requestsPerMinute: 1 } });
      mockProjectRepo.update.mockResolvedValue(updated);
      await expect(
        service.updateRateLimit('proj-1', { enabled: true, requestsPerMinute: 1 }),
      ).resolves.toBe(updated);
    });

    it('accepts boundary value 10000 for requestsPerMinute', async () => {
      const updated = makeProject({ rateLimit: { enabled: true, requestsPerMinute: 10_000 } });
      mockProjectRepo.update.mockResolvedValue(updated);
      await expect(
        service.updateRateLimit('proj-1', { enabled: true, requestsPerMinute: 10_000 }),
      ).resolves.toBe(updated);
    });
  });

  describe('getProjectForShare', () => {
    it('returns public MCP server documentation without exposing credentials', async () => {
      const token = jwt.sign({ serverId: 'proj-1', type: 'share' }, 'test-jwt-secret-value');
      mockProjectRepo.findById.mockResolvedValue(makeProject({
        description: 'Shared API',
        version: '1.2.3',
        tags: ['source:rest', 'billing'],
        auth: { type: 'api-key', name: 'x-api-key', value: 'secret-value', in: 'header' } as any,
        mcpApiKey: 'legacy-secret',
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
  });
});
