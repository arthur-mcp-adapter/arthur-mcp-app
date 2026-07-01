import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { IPromptRepository, PromptRecord } from './prompt.repository';

const prompt = (override: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-1',
  name: 'Summarize',
  description: 'Summarize text',
  content: 'Summarize {{text}}',
  tags: ['writing'],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...override,
});

describe('PromptsService', () => {
  const repo: jest.Mocked<IPromptRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  let service: PromptsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PromptsService(repo);
  });

  it('lists prompts', async () => {
    const prompts = [prompt()];
    repo.findAll.mockResolvedValue(prompts);

    await expect(service.findAll()).resolves.toBe(prompts);
  });

  it('returns a prompt by id', async () => {
    const record = prompt();
    repo.findById.mockResolvedValue(record);

    await expect(service.findById('prompt-1')).resolves.toBe(record);
  });

  it('throws when a prompt is missing', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('creates a trimmed prompt with default tags', async () => {
    const created = prompt({ name: 'New prompt', description: undefined, tags: [] });
    repo.create.mockResolvedValue(created);

    await expect(service.create({
      name: '  New prompt  ',
      description: '   ',
      content: '  Hello {{name}}  ',
    })).resolves.toBe(created);

    expect(repo.create).toHaveBeenCalledWith({
      name: 'New prompt',
      description: undefined,
      content: 'Hello {{name}}',
      tags: [],
    });
  });

  it('rejects invalid create input', async () => {
    expect(() => service.create({ name: ' ', content: 'valid' })).toThrow(BadRequestException);
    expect(() => service.create({ name: 'valid', content: ' ' })).toThrow(BadRequestException);
  });

  it('updates only provided fields and trims text fields', async () => {
    const updated = prompt({ name: 'Updated' });
    repo.update.mockResolvedValue(updated);

    await expect(service.update('prompt-1', {
      name: '  Updated  ',
      description: '  Better  ',
      content: '  Body  ',
      tags: ['new'],
    })).resolves.toBe(updated);

    expect(repo.update).toHaveBeenCalledWith('prompt-1', {
      name: 'Updated',
      description: 'Better',
      content: 'Body',
      tags: ['new'],
    });
  });

  it('throws when updating a missing prompt', async () => {
    repo.update.mockResolvedValue(null);

    await expect(service.update('missing', { name: 'Nope' })).rejects.toThrow(NotFoundException);
  });

  it('deletes an existing prompt', async () => {
    repo.delete.mockResolvedValue(true);

    await expect(service.delete('prompt-1')).resolves.toBeUndefined();
  });

  it('throws when deleting a missing prompt', async () => {
    repo.delete.mockResolvedValue(false);

    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });
});
