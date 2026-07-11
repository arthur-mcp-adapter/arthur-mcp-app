export const config = {
  get port(): number {
    return parseInt(process.env.PORT, 10) || 3000;
  },
  get databaseUri(): string {
    return process.env.DATABASE_URI ?? 'sqlite:database.sqlite';
  },
  get jwtSecret(): string {
    return process.env.JWT_SECRET ?? 'change-me-in-production-secret';
  },
  get googleClientId(): string | undefined {
    return process.env.GOOGLE_CLIENT_ID;
  },
  get googleClientSecret(): string | undefined {
    return process.env.GOOGLE_CLIENT_SECRET;
  },
  get githubClientId(): string | undefined {
    return process.env.GITHUB_CLIENT_ID;
  },
  get githubClientSecret(): string | undefined {
    return process.env.GITHUB_CLIENT_SECRET;
  },
};
