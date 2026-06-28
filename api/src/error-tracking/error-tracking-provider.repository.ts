export interface ErrorTrackingProviderRecord {
  id: string
  name: string
  description?: string
  tool: string
  dsn: string
  projectName?: string
  environment?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IErrorTrackingProviderRepository {
  findAll(): Promise<ErrorTrackingProviderRecord[]>
  findById(id: string): Promise<ErrorTrackingProviderRecord | null>
  findActive(): Promise<ErrorTrackingProviderRecord | null>
  create(data: Omit<ErrorTrackingProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ErrorTrackingProviderRecord>
  update(id: string, data: Partial<Omit<ErrorTrackingProviderRecord, 'id'>>): Promise<ErrorTrackingProviderRecord | null>
  delete(id: string): Promise<boolean>
  deactivateAll(): Promise<void>
}
