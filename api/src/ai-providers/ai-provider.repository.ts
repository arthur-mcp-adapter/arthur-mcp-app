export interface AiProviderRecord {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  isDefault: boolean;
  lastTestStatus?: 'success' | 'error';
  lastTestedAt?: Date;
  lastTestError?: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiProviderRepository {
  findAll(ownerId?: string): Promise<AiProviderRecord[]>;
  findById(id: string): Promise<AiProviderRecord | null>;
  findDefault(ownerId?: string): Promise<AiProviderRecord | null>;
  create(data: Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiProviderRecord>;
  update(id: string, data: Partial<Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AiProviderRecord | null>;
  clearDefaultExcept(ownerId?: string, id?: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}
