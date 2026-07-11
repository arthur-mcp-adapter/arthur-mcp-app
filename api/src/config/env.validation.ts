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
