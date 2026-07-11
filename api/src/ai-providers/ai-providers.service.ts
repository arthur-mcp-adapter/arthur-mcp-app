import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAiProviderRepository, AiProviderRecord } from './ai-provider.repository';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { AI_PROVIDER_REPO } from '../database/database.tokens';
import { AiProviderExecutorService } from './ai-provider-executor.service';
import { GenerateToolsDto } from './dto/generate-tools.dto';
import { ErrorTrackingService } from '../error-tracking/error-tracking.service';

type PublicProvider = Omit<AiProviderRecord, 'apiKey'> & { apiKeySet: boolean };

function toPublic(r: AiProviderRecord): PublicProvider {
  const { apiKey, ...rest } = r;
  return { ...rest, apiKeySet: !!apiKey };
}

function isSecretRef(value?: string) {
  return !!value && /^\{\{secret:[^}]+\}\}$/.test(value);
}

function assertSecretBackedApiKey(provider: string, apiKey?: string) {
  const normalized = provider === 'gemini' ? 'google' : provider === 'azure' ? 'azure-openai' : provider;
  if (normalized === 'ollama' && !apiKey) return;
  if (!isSecretRef(apiKey)) {
    throw new BadRequestException('AI provider API key must be selected from Secrets.');
  }
}

function connectionErrorMessage(err: any) {
  return err?.response?.data?.error?.message
    ?? err?.response?.data?.message
    ?? err?.message
    ?? 'Connection test failed.';
}

@Injectable()
export class AiProvidersService {
  constructor(
    @Inject(AI_PROVIDER_REPO) private readonly repo: IAiProviderRepository,
    private readonly executor: AiProviderExecutorService,
    private readonly errorTracking: ErrorTrackingService,
  ) {}

  async findAll(ownerId: string): Promise<PublicProvider[]> {
    const records = await this.repo.findAll(ownerId);
    return records.map(toPublic);
  }

  async findOne(id: string): Promise<PublicProvider> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    return toPublic(record);
  }

  async create(dto: CreateAiProviderDto, ownerId: string): Promise<PublicProvider> {
    assertSecretBackedApiKey(dto.provider, dto.apiKey);
    if (dto.isDefault) await this.repo.clearDefaultExcept(ownerId);
    const record = await this.repo.create({
      name: dto.name,
      description: dto.description,
      provider: dto.provider,
      model: dto.model,
      apiKey: dto.apiKey ?? '',
      baseUrl: dto.baseUrl,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      lastTestStatus: undefined,
      lastTestedAt: undefined,
      lastTestError: undefined,
      ownerId,
    });
    return toPublic(record);
  }

  async update(id: string, dto: UpdateAiProviderDto, ownerId: string): Promise<PublicProvider> {
    if (dto.provider || dto.apiKey !== undefined) {
      const current = await this.repo.findById(id);
      if (!current) throw new NotFoundException(`AI provider ${id} not found`);
      assertSecretBackedApiKey(dto.provider ?? current.provider, dto.apiKey ?? current.apiKey);
    }
    if (dto.isDefault) await this.repo.clearDefaultExcept(ownerId, id);
    const record = await this.repo.update(id, dto);
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    return toPublic(record);
  }

  async setDefault(id: string, ownerId: string): Promise<PublicProvider> {
    await this.repo.clearDefaultExcept(ownerId, id);
    const record = await this.repo.update(id, { isDefault: true, isActive: true });
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    return toPublic(record);
  }

  async test(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    try {
      const result = await this.executor.test(record);
      await this.repo.update(id, { lastTestStatus: 'success', lastTestedAt: new Date(), lastTestError: undefined });
      return result;
    } catch (err: any) {
      const message = connectionErrorMessage(err);
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { ai_provider_id: id, ai_provider: record.provider, ai_provider_operation: 'test_saved' },
      });
      await this.repo.update(id, { lastTestStatus: 'error', lastTestedAt: new Date(), lastTestError: message });
      return { ok: false, message, latencyMs: 0 };
    }
  }

  async testConfig(dto: CreateAiProviderDto) {
    assertSecretBackedApiKey(dto.provider, dto.apiKey);
    try {
      return await this.executor.test({
        id: 'draft',
        name: dto.name || 'Draft provider',
        description: dto.description,
        provider: dto.provider,
        model: dto.model,
        apiKey: dto.apiKey ?? '',
        baseUrl: dto.baseUrl,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err: any) {
      this.errorTracking.captureBackendError({
        error: err,
        source: 'http_request',
        tags: { ai_provider: dto.provider, ai_provider_operation: 'test_config' },
      });
      return { ok: false, message: connectionErrorMessage(err), latencyMs: 0 };
    }
  }

  async generateTools(dto: GenerateToolsDto, ownerId: string) {
    const provider = dto.providerId ? await this.repo.findById(dto.providerId) : await this.repo.findDefault(ownerId);
    if (!provider || (dto.providerId && provider.ownerId !== ownerId)) {
      throw new NotFoundException('No AI provider found. Configure a default provider or select one explicitly.');
    }
    return {
      providerId: provider.id,
      tools: await this.executor.generateTools(provider, {
        serverName: dto.serverName,
        baseUrl: dto.baseUrl,
        description: dto.description,
        tools: dto.tools ?? [],
      }),
    };
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundException(`AI provider ${id} not found`);
  }
}
