import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_providers')
export class AiProviderEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'name' }) name: string;
  @Column({ name: 'description', nullable: true }) description?: string;
  @Column({ name: 'provider' }) provider: string;
  @Column({ name: 'model' }) model: string;
  @Column('text', { name: 'api_key' }) apiKey: string;
  @Column({ name: 'base_url', nullable: true }) baseUrl?: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'is_default', default: false }) isDefault: boolean;
  @Column({ name: 'last_test_status', nullable: true }) lastTestStatus?: string;
  @Column({ name: 'last_tested_at', nullable: true }) lastTestedAt?: Date;
  @Column({ name: 'last_test_error', nullable: true }) lastTestError?: string;
  @Column({ name: 'owner_id', nullable: true }) ownerId?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
