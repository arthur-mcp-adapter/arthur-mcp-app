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
  get selfHosted(): boolean {
    return process.env.SELF_HOSTED === 'true';
  },
  get appUrl(): string {
    return process.env.APP_URL ?? 'http://localhost:3000';
  },
  get smtpHost(): string | undefined {
    return process.env.SMTP_HOST;
  },
  get smtpPort(): number {
    return parseInt(process.env.SMTP_PORT, 10) || 587;
  },
  get smtpUser(): string | undefined {
    return process.env.SMTP_USER;
  },
  get smtpFrom(): string | undefined {
    return process.env.SMTP_FROM;
  },
  get globalRequestHeaders(): { name: string; value: string }[] {
    if (!process.env.GLOBAL_REQUEST_HEADERS) return [];
    try {
      return JSON.parse(process.env.GLOBAL_REQUEST_HEADERS);
    } catch {
      return [];
    }
  },
  get supabaseUrl(): string | undefined {
    return process.env.SUPABASE_URL;
  },
  get supabaseSecretKey(): string | undefined {
    return process.env.SUPABASE_SECRET_KEY;
  },
  get supabasePublishableKey(): string | undefined {
    return process.env.SUPABASE_PUBLISHABLE_KEY;
  },
};
