import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SwaggerService } from './swagger.service';
import { PROJECT_REPO } from '../database/database.tokens';
import { DynamicMcpService } from '../dynamic-mcp/dynamic-mcp.service';
import type { SwaggerProjectRecord } from './swagger-project.repository';
import { SwaggerApiKeysService } from './swagger-api-keys.service';
import { SwaggerImportService } from './swagger-import.service';
import { JwtSecretService } from '../settings/jwt-secret.service';

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

const mockDynamicMcp = {
  invalidate: jest.fn(),
};

const mockImportService = {};
const mockApiKeysService = {};
const mockJwtSecretService = { getSecret: jest.fn().mockResolvedValue('test-jwt-secret-value') };

describe('SwaggerService', () => {
  let service: SwaggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwaggerService,
        { provide: PROJECT_REPO, useValue: mockProjectRepo },
        { provide: DynamicMcpService, useValue: mockDynamicMcp },
        { provide: SwaggerImportService, useValue: mockImportService },
        { provide: SwaggerApiKeysService, useValue: mockApiKeysService },
        { provide: JwtSecretService, useValue: mockJwtSecretService },
      ],
    }).compile();

    service = module.get<SwaggerService>(SwaggerService);
    jest.clearAllMocks();
    mockJwtSecretService.getSecret.mockResolvedValue('test-jwt-secret-value');
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
});
