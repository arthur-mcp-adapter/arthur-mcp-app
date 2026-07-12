import { z } from 'zod';

import { parseDatabaseUri } from '../database/database-uri';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test', 'dev']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URI: z.string().min(1).default('sqlite:database.sqlite'),
    DB_SYNC: z.enum(['true', 'false']).optional(),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters')
      .default('change-me-in-production-secret'),
    ENABLE_STRUCTURED_LOGS: z.enum(['true', 'false']).default('true'),
    ENABLE_METRICS: z.enum(['true', 'false']).default('true'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
    SERVICE_NAME: z.string().min(1).default('arthur-mcp-adapter'),
    SERVICE_VERSION: z.string().min(1).default('1.0.0'),
    PROMETHEUS_METRICS_PATH: z.string().min(1).default('/metrics'),
    SELF_HOSTED: z.enum(['true', 'false']).default('false'),
    APP_URL: z.string().url().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    GLOBAL_REQUEST_HEADERS: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    SUPABASE_SECRET_KEY: z.string().optional(),
    SUPABASE_JWKS_URL: z.string().optional(),
    SUPABASE_JWKS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    try {
      parseDatabaseUri(data.DATABASE_URI);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'Invalid DATABASE_URI',
        path: ['DATABASE_URI'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return result.data;
}
