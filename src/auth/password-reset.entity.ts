import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('password_resets')
export class PasswordResetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
