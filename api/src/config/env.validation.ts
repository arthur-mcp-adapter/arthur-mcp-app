import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test', 'dev']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE: z.enum(['mongodb', 'sqlite']).default('sqlite'),
    MONGODB_URI: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
    DASHBOARD_USER: z.string().min(1).default('admin'),
    DASHBOARD_PASSWORD: z.string().min(1).default('admin123'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters')
      .default('change-me-in-production-secret'),
    ENABLE_OBSERVABILITY: z.enum(['true', 'false']).default('true'),
    ENABLE_STRUCTURED_LOGS: z.enum(['true', 'false']).default('true'),
    ENABLE_METRICS: z.enum(['true', 'false']).default('true'),
    ENABLE_TRACING: z.enum(['true', 'false']).default('false'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
    SERVICE_NAME: z.string().min(1).default('arthur-mcp-adapter'),
    SERVICE_VERSION: z.string().min(1).default('1.0.0'),
    PROMETHEUS_METRICS_PATH: z.string().min(1).default('/metrics'),
    OTEL_SERVICE_NAME: z.string().min(1).default('arthur-mcp-adapter'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
    OTEL_EXPORTER_TYPE: z.enum(['console', 'otlp']).default('console'),
  })
  .superRefine((data, ctx) => {
    if (data.DATABASE === 'mongodb' && !data.MONGODB_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MONGODB_URI is required when DATABASE=mongodb',
        path: ['MONGODB_URI'],
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
