import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('swagger_projects')
export class SwaggerProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  baseUrl: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  version?: string;

  @Column('text', { nullable: true })
  rawSpec?: string;

  @Column('text', { default: '[]' })
  tools: string;

  @Column('text', { default: '{"type":"none"}' })
  auth: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  mcpApiKey?: string;

  @Column('text', { default: '[]' })
  mcpApiKeys: string;

  @Column({ nullable: true })
  oauthClientId?: string;

  @Column({ nullable: true })
  oauthClientSecret?: string;

  @Column('text', { default: '[]' })
  tags: string;

  @Column('text', { default: '{"enabled":false,"requestsPerMinute":60}' })
  rateLimit: string;

  @Column({ default: false })
  isPaused: boolean;

  @Column('text', { default: '{"enabled":false,"message":""}' })
  maintenanceMode: string;

  @Column('text', { default: '{"enabled":false,"timezone":"UTC","schedule":[]}' })
  availabilityWindow: string;

  @Column('text', { default: '{"enabled":false,"errorThresholdPct":20,"notifyEmail":""}' })
  alertConfig: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
