export interface SecretRecord {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SecretMetadataRecord = Omit<SecretRecord, 'value'>;

export interface ISecretRepository {
  findAll(): Promise<SecretRecord[]>;
  findById(id: string): Promise<SecretRecord | null>;
  findByName(name: string): Promise<SecretRecord | null>;
  create(data: Omit<SecretRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecretRecord>;
  update(id: string, data: Partial<Omit<SecretRecord, 'id'>>): Promise<SecretRecord | null>;
  delete(id: string): Promise<boolean>;
}
