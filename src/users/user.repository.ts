export interface UserRecord {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findAll(): Promise<Omit<UserRecord, 'password'>[]>;
  create(data: { username: string; email: string; password: string; role?: string }): Promise<UserRecord>;
  update(id: string, data: Partial<Omit<UserRecord, '_id'>>): Promise<UserRecord>;
  delete(id: string): Promise<void>;
}
