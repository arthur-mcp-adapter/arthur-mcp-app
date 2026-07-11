export interface UserRecord {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  googleId?: string | null;
  githubId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByGoogleId(googleId: string): Promise<UserRecord | null>;
  findByGithubId(githubId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findAll(): Promise<Omit<UserRecord, 'password'>[]>;
  create(data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    googleId?: string;
    githubId?: string;
  }): Promise<UserRecord>;
  update(id: string, data: Partial<Omit<UserRecord, '_id'>>): Promise<UserRecord>;
  delete(id: string): Promise<void>;
}
