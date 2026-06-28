import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, default: 'global' })
  key: string;

  @Column({ default: '' })
  serverBaseUrl: string;

  @Column({ default: 30000 })
  defaultTimeoutMs: number;

  @Column({ default: '' })
  smtpHost: string;

  @Column({ default: 587 })
  smtpPort: number;

  @Column({ default: '' })
  smtpUser: string;

  @Column({ default: '' })
  smtpPass: string;

  @Column({ default: '' })
  smtpFrom: string;

  @Column({ default: '' })
  jwtSecret: string;

  @Column({ type: 'simple-json', nullable: true })
  globalRequestHeaders: { name: string; value: string }[] | null;

  @Column({ type: 'simple-json', nullable: true })
  observabilityEnvironment: Record<string, string> | null;

  @Column({ nullable: true, default: null })
  termServer: string | null;

  @Column({ nullable: true, default: null })
  termTool: string | null;

  @Column({ nullable: true, default: null })
  termResource: string | null;

  @Column({ nullable: true, default: null })
  termPrompt: string | null;

  @Column({ nullable: true, default: null })
  termChain: string | null;

  @Column({ nullable: true, default: null })
  termSecret: string | null;
}
