import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository, McpApiKeyEntry } from './swagger-project.repository';

@Injectable()
export class SwaggerApiKeysService {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  async generateLegacyKey(id: string): Promise<{ mcpApiKey: string }> {
    const key = crypto.randomBytes(32).toString('hex');
    const server = await this.projectRepo.update(id, { mcpApiKey: key });
    if (!server) throw new NotFoundException('Project not found.');
    return { mcpApiKey: key };
  }

  async revokeLegacyKey(id: string): Promise<void> {
    const server = await this.projectRepo.update(id, { mcpApiKey: null });
    if (!server) throw new NotFoundException('Project not found.');
  }

  async addKey(id: string, name: string): Promise<McpApiKeyEntry> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const entry: McpApiKeyEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      key: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
    };

    server.mcpApiKeys.push(entry);
    await this.projectRepo.save(server);
    return entry;
  }

  async removeKey(id: string, keyId: string): Promise<void> {
    const server = await this.projectRepo.findById(id);
    if (!server) throw new NotFoundException('Project not found.');

    const idx = server.mcpApiKeys.findIndex((key) => key.id === keyId);
    if (idx === -1) throw new NotFoundException('Key not found.');

    server.mcpApiKeys.splice(idx, 1);
    await this.projectRepo.save(server);
  }
}

