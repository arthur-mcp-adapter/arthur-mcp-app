import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseConfig = {
    JWT_SECRET: 'a-valid-development-secret',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'anon-key',
    SUPABASE_SECRET_KEY: 'secret-key',
    SUPABASE_JWKS_URL: 'https://project.supabase.co/auth/v1/.well-known/jwks.json',
  };

  it.each([
    ['SQLite', 'sqlite:database.sqlite'],
    ['PostgreSQL', 'postgres://mcp:mcppassword@localhost:5432/mcp_db'],
    ['PostgreSQL alias', 'postgresql://mcp:mcppassword@localhost:5432/mcp_db'],
    ['MySQL', 'mysql://mcp:mcppassword@localhost:3306/mcp_db'],
  ])('allows %s DATABASE_URI values', (_label, databaseUri) => {
    expect(validateEnv({ ...baseConfig, DATABASE_URI: databaseUri }).DATABASE_URI).toBe(databaseUri);
  });

  it.each([
    ['mongodb://localhost:27017/mcp_db'],
    ['mariadb://mcp:mcppassword@localhost:3306/mcp_db'],
    ['redis://localhost:6379'],
    ['database.sqlite'],
  ])('blocks unsupported DATABASE_URI value %s', (databaseUri) => {
    expect(() => validateEnv({ ...baseConfig, DATABASE_URI: databaseUri })).toThrow(
      /Environment validation failed:[\s\S]*DATABASE_URI:[\s\S]*Use sqlite:<path>, postgres:\/\/\.\.\., postgresql:\/\/\.\.\. or mysql:\/\/\.\.\./,
    );
  });
});
