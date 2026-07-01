import { NotFoundException } from '@nestjs/common';
import { SwaggerApiKeysService } from './swagger-api-keys.service';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from './swagger-project.repository';

const server = (override: Partial<SwaggerProjectRecord> = {}): SwaggerProjectRecord => ({
  _id: 'server-1',
  name: 'Payments',
  baseUrl: 'https://api.example.com',
  tools: [],
  auth: { type: 'none' },
  status: 'active',
  mcpApiKey: null,
  mcpApiKeys: [],
  resources: [],
  prompts: [],
  chains: [],
  tags: [],
  rateLimit: { enabled: false, requestsPerMinute: 60 },
  isPaused: false,
  maintenanceMode: { enabled: false, message: '' },
  availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
  alertConfig: { enabled: false, errorThresholdPct: 10, notifyEmail: '' },
  ...override,
});

describe('SwaggerApiKeysService', () => {
  const repo: jest.Mocked<Pick<ISwaggerProjectRepository, 'update' | 'findById' | 'save'>> = {
    update: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  let service: SwaggerApiKeysService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SwaggerApiKeysService(repo as unknown as ISwaggerProjectRepository);
  });

  it('generates and persists a legacy MCP API key', async () => {
    repo.update.mockResolvedValue(server());

    const result = await service.generateLegacyKey('server-1');

    expect(result.mcpApiKey).toMatch(/^[a-f0-9]{64}$/);
    expect(repo.update).toHaveBeenCalledWith('server-1', { mcpApiKey: result.mcpApiKey });
  });

  it('throws when generating a legacy key for a missing server', async () => {
    repo.update.mockResolvedValue(null);

    await expect(service.generateLegacyKey('missing')).rejects.toThrow(NotFoundException);
  });

  it('revokes a legacy MCP API key', async () => {
    repo.update.mockResolvedValue(server());

    await service.revokeLegacyKey('server-1');

    expect(repo.update).toHaveBeenCalledWith('server-1', { mcpApiKey: null });
  });

  it('throws when revoking a legacy key for a missing server', async () => {
    repo.update.mockResolvedValue(null);

    await expect(service.revokeLegacyKey('missing')).rejects.toThrow(NotFoundException);
  });

  it('adds a named key to an existing server', async () => {
    const record = server({ mcpApiKeys: [] });
    repo.findById.mockResolvedValue(record);
    repo.save.mockImplementation(async (saved) => saved as SwaggerProjectRecord);

    const entry = await service.addKey('server-1', '  Claude Desktop  ');

    expect(entry).toMatchObject({
      name: 'Claude Desktop',
      key: expect.stringMatching(/^[a-f0-9]{64}$/),
      createdAt: expect.any(Date),
    });
    expect(entry.id).toEqual(expect.any(String));
    expect(record.mcpApiKeys).toEqual([entry]);
    expect(repo.save).toHaveBeenCalledWith(record);
  });

  it('throws when adding a key to a missing server', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.addKey('missing', 'Client')).rejects.toThrow(NotFoundException);
  });

  it('removes an existing named key', async () => {
    const record = server({
      mcpApiKeys: [
        { id: 'key-1', name: 'Claude', key: 'secret-1', createdAt: new Date() },
        { id: 'key-2', name: 'Cursor', key: 'secret-2', createdAt: new Date() },
      ],
    });
    repo.findById.mockResolvedValue(record);

    await service.removeKey('server-1', 'key-1');

    expect(record.mcpApiKeys.map((key) => key.id)).toEqual(['key-2']);
    expect(repo.save).toHaveBeenCalledWith(record);
  });

  it('throws when removing a missing named key', async () => {
    repo.findById.mockResolvedValue(server({ mcpApiKeys: [] }));

    await expect(service.removeKey('server-1', 'missing-key')).rejects.toThrow(NotFoundException);
  });

  it('throws when removing a key from a missing server', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.removeKey('missing', 'key-1')).rejects.toThrow(NotFoundException);
  });
});
