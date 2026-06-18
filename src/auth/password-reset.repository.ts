export interface PasswordResetRecord {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface IPasswordResetRepository {
  create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetRecord>;
  findByToken(token: string): Promise<PasswordResetRecord | null>;
  deleteByUserId(userId: string): Promise<void>;
  markUsed(id: string): Promise<void>;
}
