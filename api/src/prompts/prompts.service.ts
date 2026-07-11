import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PROMPT_REPO } from '../database/database.tokens';
import { IPromptRepository, PromptRecord } from './prompt.repository';

@Injectable()
export class PromptsService {
  constructor(@Inject(PROMPT_REPO) private readonly promptRepo: IPromptRepository) {}

  findAll(ownerId: string): Promise<PromptRecord[]> {
    return this.promptRepo.findAll(ownerId);
  }

  async findById(id: string): Promise<PromptRecord> {
    const prompt = await this.promptRepo.findById(id);
    if (!prompt) throw new NotFoundException('Prompt not found.');
    return prompt;
  }

  create(dto: { name: string; description?: string; content: string; tags?: string[] }, ownerId: string): Promise<PromptRecord> {
    if (!dto.name?.trim()) throw new BadRequestException('name is required.');
    if (!dto.content?.trim()) throw new BadRequestException('content is required.');

    return this.promptRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      content: dto.content.trim(),
      tags: dto.tags ?? [],
      ownerId,
    });
  }

  async update(
    id: string,
    dto: Partial<{ name: string; description?: string; content: string; tags: string[] }>,
  ): Promise<PromptRecord> {
    const updated = await this.promptRepo.update(id, {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() || undefined }),
      ...(dto.content !== undefined && { content: dto.content.trim() }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
    });
    if (!updated) throw new NotFoundException('Prompt not found.');
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.promptRepo.delete(id);
    if (!deleted) throw new NotFoundException('Prompt not found.');
  }
}
