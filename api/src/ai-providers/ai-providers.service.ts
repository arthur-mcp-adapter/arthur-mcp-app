import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAiProviderRepository, AiProviderRecord } from './ai-provider.repository';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { AI_PROVIDER_REPO } from '../database/database.tokens';

type PublicProvider = Omit<AiProviderRecord, 'apiKey'>;

function toPublic(r: AiProviderRecord): PublicProvider {
  const { apiKey: _key, ...rest } = r;
  return rest;
}

@Injectable()
export class AiProvidersService {
  constructor(@Inject(AI_PROVIDER_REPO) private readonly repo: IAiProviderRepository) {}

  async findAll(): Promise<PublicProvider[]> {
    const records = await this.repo.findAll();
    return records.map(toPublic);
  }

  async findOne(id: string): Promise<PublicProvider> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    return toPublic(record);
  }

  async create(dto: CreateAiProviderDto): Promise<PublicProvider> {
    const record = await this.repo.create({
      name: dto.name,
      description: dto.description,
      provider: dto.provider,
      model: dto.model,
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl,
      isActive: dto.isActive ?? true,
    });
    return toPublic(record);
  }

  async update(id: string, dto: UpdateAiProviderDto): Promise<PublicProvider> {
    const record = await this.repo.update(id, dto);
    if (!record) throw new NotFoundException(`AI provider ${id} not found`);
    return toPublic(record);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundException(`AI provider ${id} not found`);
  }
}
