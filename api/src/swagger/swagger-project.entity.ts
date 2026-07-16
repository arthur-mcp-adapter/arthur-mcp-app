import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('swagger_projects')
export class SwaggerProjectEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'base_url' })
  baseUrl: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'version', nullable: true })
  version?: string;

  @Column({ name: 'share_slug', nullable: true, unique: true })
  shareSlug?: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId?: string;

  @Column('text', { name: 'raw_spec', nullable: true })
  rawSpec?: string;

  @Column('text', { name: 'tools', default: '[]' })
  tools: string;

  @Column('text', { name: 'auth', default: '{"type":"none"}' })
  auth: string;

  @Column({ name: 'status', default: 'active' })
  status: string;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ name: 'mcp_api_key', nullable: true })
  mcpApiKey?: string;

  @Column('text', { name: 'mcp_api_keys', default: '[]' })
  mcpApiKeys: string;

  @Column('text', { name: 'resources', default: '[]' })
  resources: string;

  @Column('text', { name: 'prompts', default: '[]' })
  prompts: string;

  @Column('text', { name: 'chains', default: '[]' })
  chains: string;

  @Column({ name: 'oauth_client_id', nullable: true })
  oauthClientId?: string;

  @Column({ name: 'oauth_client_secret', nullable: true })
  oauthClientSecret?: string;

  @Column('text', { name: 'oauth_config', default: '{"mode":"none"}' })
  oauthConfig: string;

  @Column('text', { name: 'tags', default: '[]' })
  tags: string;

  @Column('text', { name: 'rate_limit', default: '{"enabled":false,"requestsPerMinute":60}' })
  rateLimit: string;

  @Column({ name: 'is_paused', default: false })
  isPaused: boolean;

  @Column('text', { name: 'maintenance_mode', default: '{"enabled":false,"message":""}' })
  maintenanceMode: string;

  @Column('text', { name: 'availability_window', default: '{"enabled":false,"timezone":"UTC","schedule":[]}' })
  availabilityWindow: string;

  @Column('text', { name: 'alert_config', default: '{"enabled":false,"errorThresholdPct":20,"notifyEmail":""}' })
  alertConfig: string;

  @Column('text', { name: 'tenant_config', default: '{"enabled":false,"params":[]}' })
  tenantConfig: string;

  @Column('text', { name: 'response_config', default: '{"enabled":false}' })
  responseConfig: string;

  @Column('text', { name: 'connection_config', nullable: true })
  connectionConfig?: string;

  @Column('text', { name: 'db_queries', default: '[]' })
  dbQueries: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
