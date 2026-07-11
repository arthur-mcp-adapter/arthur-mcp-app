export interface PromptRecord {
  id: string;
  name: string;
  description?: string;
  content: string;
  tags: string[];
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromptRepository {
  findAll(ownerId?: string): Promise<PromptRecord[]>;
  findById(id: string): Promise<PromptRecord | null>;
  create(data: Omit<PromptRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptRecord>;
  update(id: string, data: Partial<Omit<PromptRecord, 'id'>>): Promise<PromptRecord | null>;
  delete(id: string): Promise<boolean>;
}
