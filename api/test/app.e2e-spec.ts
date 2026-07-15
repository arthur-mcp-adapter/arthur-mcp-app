import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(typeof res.body.uptime).toBe('number');
          expect(typeof res.body.timestamp).toBe('string');
        });
    });
  });

  describe('GET /users/me', () => {
    // Regression check: UsersModule must be directly registered on AppModule. It used to only
    // get mounted transitively through AuthModule's imports; once AuthModule stopped needing
    // UsersService (Supabase-only auth), that transitive path disappeared and this route silently
    // 404'd instead of enforcing auth. A 401 here (guard ran) proves the controller is mounted;
    // a 404 would mean it's unmounted again.
    it('requires authentication rather than 404ing', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });

  describe('GET /mcp-docs', () => {
    it('returns HTML documentation without auth', () => {
      return request(app.getHttpServer())
        .get('/mcp-docs')
        .expect(200)
        .expect('Content-Type', /html/);
    });

    it('contains registered tools in the HTML', async () => {
      const res = await request(app.getHttpServer()).get('/mcp-docs');
      expect(res.text).toContain('getUsers');
      expect(res.text).toContain('getBookings');
    });
  });

  describe('POST /mcp — authentication', () => {
    it('returns 401 without x-api-key', () => {
      return request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
        .expect(401);
    });

    it('returns 401 with wrong x-api-key', () => {
      return request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .set('x-api-key', 'wrong-key')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
        .expect(401);
    });

    it('returns tool list with valid x-api-key', () => {
      return request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .set('x-api-key', 'test-key')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
        .expect(200)
        .expect((res) => {
          expect(res.body.result.tools).toBeInstanceOf(Array);
          expect(res.body.result.tools.length).toBeGreaterThan(0);
        });
    });

    it('lists resources with valid x-api-key', () => {
      return request(app.getHttpServer())
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .set('x-api-key', 'test-key')
        .send({ jsonrpc: '2.0', id: 1, method: 'resources/list', params: {} })
        .expect(200)
        .expect((res) => {
          expect(res.body.result.resources).toBeInstanceOf(Array);
          const uris = res.body.result.resources.map((r: any) => r.uri);
          expect(uris).toContain('ui://docs');
          expect(uris).toContain('ui://dashboard');
        });
    });
  });
});
