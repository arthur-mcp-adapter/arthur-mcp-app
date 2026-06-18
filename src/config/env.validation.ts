import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test', 'dev']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE: z.enum(['mongodb', 'sqlite']).default('sqlite'),
    MONGODB_URI: z.string().url().optional(),
    DASHBOARD_USER: z.string().min(1).default('admin'),
    DASHBOARD_PASSWORD: z.string().min(1).default('admin123'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters')
      .default('change-me-in-production-secret'),
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
