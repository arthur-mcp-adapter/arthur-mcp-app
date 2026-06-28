import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('error_tracking_providers')
export class ErrorTrackingProviderEntity {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() name: string
  @Column({ nullable: true }) description?: string
  @Column() tool: string
  @Column('text') dsn: string
  @Column({ nullable: true }) projectName?: string
  @Column({ nullable: true }) environment?: string
  @Column({ default: false }) isActive: boolean
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
