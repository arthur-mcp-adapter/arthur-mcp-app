process.env.NODE_ENV = 'test';
process.env.MCP_API_KEY = 'test-key';
process.env.PORT = '3001';
process.env.EXTERNAL_API_BASE_URL = 'https://jsonplaceholder.typicode.com';
// Supabase Auth is required config now (env.validation.ts) — fake but well-formed values so
// AppModule boots in e2e; no test here actually calls out to a real Supabase project.
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.SUPABASE_JWKS_URL = 'https://test-project.supabase.co/auth/v1/.well-known/jwks.json';
