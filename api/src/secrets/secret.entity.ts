import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('secrets')
@Index('UQ_secrets_owner_id_name', ['ownerId', 'name'], { unique: true })
export class SecretEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column('text', { name: 'value' })
  value: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
