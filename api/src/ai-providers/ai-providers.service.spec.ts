import { NotFoundException } from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service';
import type { IAiProviderRepository, AiProviderRecord } from './ai-provider.repository';
import type { AiProviderExecutorService } from './ai-provider-executor.service';
import type { ErrorTrackingService } from '../error-tracking/error-tracking.service';

const record = (overrides: Partial<AiProviderRecord> = {}): AiProviderRecord => ({
  id: 'provider-1',
  name: 'OpenAI production',
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'secret',
  isActive: true,
  isDefault: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('AiProvidersService', () => {
  let repo: jest.Mocked<IAiProviderRepository>;
  let executor: jest.Mocked<Pick<AiProviderExecutorService, 'test' | 'generateTools'>>;
  let errorTracking: jest.Mocked<Pick<ErrorTrackingService, 'captureBackendError'>>;
  let service: AiProvidersService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      clearDefaultExcept: jest.fn(),
      delete: jest.fn(),
    };
    executor = {
      test: jest.fn(),
      generateTools: jest.fn(),
    };
    errorTracking = {
      captureBackendError: jest.fn(),
    };
    service = new AiProvidersService(
      repo,
      executor as unknown as AiProviderExecutorService,
      errorTracking as unknown as ErrorTrackingService,
    );
  });

  it('omits apiKey from public reads', async () => {
    repo.findAll.mockResolvedValue([record()]);

    const result = await service.findAll('owner-1');

    expect(result[0]).not.toHaveProperty('apiKey');
  });

  it('clears other defaults before creating a default provider', async () => {
    repo.create.mockImplementation(async (data) => record({ ...data, id: 'provider-2', isDefault: true }));

    await service.create({
      name: 'Default',
      provider: 'ollama',
      model: 'llama3.2',
      apiKey: '',
      isDefault: true,
    }, 'owner-1');

    expect(repo.clearDefaultExcept).toHaveBeenCalledWith('owner-1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true, apiKey: '' }));
  });

  it('marks a provider as default and active', async () => {
    repo.update.mockResolvedValue(record({ isDefault: true }));

    await service.setDefault('provider-1', 'owner-1');

    expect(repo.clearDefaultExcept).toHaveBeenCalledWith('owner-1', 'provider-1');
    expect(repo.update).toHaveBeenCalledWith('provider-1', { isDefault: true, isActive: true });
  });

  it('stores successful connection test metadata', async () => {
    repo.findById.mockResolvedValue(record());
    executor.test.mockResolvedValue({ ok: true, message: 'ok', latencyMs: 12 });

    const result = await service.test('provider-1');

    expect(result.ok).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('provider-1', expect.objectContaining({ lastTestStatus: 'success' }));
  });

  it('stores failed connection test metadata without exposing apiKey', async () => {
    repo.findById.mockResolvedValue(record());
    executor.test.mockRejectedValue(new Error('bad key'));

    const result = await service.test('provider-1');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('bad key');
    expect(repo.update).toHaveBeenCalledWith('provider-1', expect.objectContaining({ lastTestStatus: 'error', lastTestError: 'bad key' }));
  });

  it('returns a failed draft test summary when provider execution fails', async () => {
    executor.test.mockRejectedValue({
      response: { data: { error: { message: 'Incorrect API key provided.' } } },
    });

    const result = await service.testConfig({
      name: 'Draft',
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '{{secret:GPT_KEY}}',
      isActive: true,
    });

    expect(result).toEqual({
      ok: false,
      message: 'Incorrect API key provided.',
      latencyMs: 0,
    });
  });

  it('uses the default provider for tool generation when no provider is selected', async () => {
    repo.findDefault.mockResolvedValue(record({ id: 'default-provider' }));
    executor.generateTools.mockResolvedValue([{ name: 'list_customers', method: 'GET', path: '/customers' }]);

    const result = await service.generateTools({
      tools: [{ name: 'getCustomers', method: 'GET', path: '/customers' }],
    }, 'owner-1');

    expect(result.providerId).toBe('default-provider');
    expect(executor.generateTools).toHaveBeenCalledWith(expect.objectContaining({ id: 'default-provider' }), expect.any(Object));
  });

  it('throws when the selected provider does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.generateTools({ providerId: 'missing', tools: [] }, 'owner-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
