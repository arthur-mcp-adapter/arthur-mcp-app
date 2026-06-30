export interface AiProviderRecord {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiProviderRepository {
  findAll(): Promise<AiProviderRecord[]>;
  findById(id: string): Promise<AiProviderRecord | null>;
  create(data: Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiProviderRecord>;
  update(id: string, data: Partial<Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AiProviderRecord | null>;
  delete(id: string): Promise<boolean>;
}
