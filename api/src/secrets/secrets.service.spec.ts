import { BadRequestException } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { ISecretRepository, SecretRecord } from './secret.repository';

const makeSecret = (overrides: Partial<SecretRecord> = {}): SecretRecord => ({
  id: 'secret-1',
  name: 'API_TOKEN',
  value: 'super-secret',
  description: 'Token used by an upstream API',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

const repo: jest.Mocked<ISecretRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('SecretsService', () => {
  let service: SecretsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecretsService(repo);
  });

  it('returns metadata only when listing secrets', async () => {
    repo.findAll.mockResolvedValue([makeSecret()]);

    const result = await service.findAll('owner-1');

    expect(result).toEqual([
      {
        id: 'secret-1',
        name: 'API_TOKEN',
        description: 'Token used by an upstream API',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    expect('value' in result[0]).toBe(false);
  });

  it('returns metadata only when reading a secret by id', async () => {
    repo.findById.mockResolvedValue(makeSecret());

    const result = await service.findById('secret-1');

    expect(result.name).toBe('API_TOKEN');
    expect('value' in result).toBe(false);
  });

  it('reveals only the value through revealValue', async () => {
    repo.findById.mockResolvedValue(makeSecret());

    await expect(service.revealValue('secret-1')).resolves.toEqual({ value: 'super-secret' });
  });

  it('returns metadata only after creating a secret', async () => {
    repo.findByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(makeSecret());

    const result = await service.create({ name: 'API_TOKEN', value: 'super-secret' }, 'owner-1');

    expect(result.name).toBe('API_TOKEN');
    expect('value' in result).toBe(false);
  });

  it('rejects duplicate names', async () => {
    repo.findByName.mockResolvedValue(makeSecret());

    await expect(service.create({ name: 'API_TOKEN', value: 'super-secret' }, 'owner-1')).rejects.toThrow(BadRequestException);
  });
});

