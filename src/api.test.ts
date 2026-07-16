import { describe, it, expect, beforeEach, vi } from 'vitest';

const signOut = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('./supabaseClient', () => ({ supabase: { auth: { signOut } } }));

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    signOut.mockClear();
  });

  it('exports a default axios instance with baseURL /api', async () => {
    const { default: api } = await import('./api');
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('has get and post methods', async () => {
    const { default: api } = await import('./api');
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
  });

  it('has delete and put methods', async () => {
    const { default: api } = await import('./api');
    expect(typeof api.delete).toBe('function');
    expect(typeof api.put).toBe('function');
  });

  it('attaches the Supabase token only to application API requests', async () => {
    const { default: api } = await import('./api');
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;

    localStorage.setItem('token', 'tok123');
    expect(handler({ url: '/users/me', headers: {} })).toMatchObject({ headers: { Authorization: 'Bearer tok123' } });

    expect(handler({ url: '/mcp/server/payments-api', headers: {} })).toEqual({
      url: '/mcp/server/payments-api',
      headers: {},
    });

    expect(handler({
      url: '/mcp/server/payments-api',
      headers: { Authorization: 'Bearer mcp-oauth-token' },
    })).toMatchObject({ headers: { Authorization: 'Bearer mcp-oauth-token' } });

    localStorage.clear();
    expect(handler({ url: '/users/me', headers: {} })).toEqual({ url: '/users/me', headers: {} });
  });

  it('attaches response interceptor for 401 handling', async () => {
    const { default: api } = await import('./api');
    const originalLocation = window.location;
    const location = { ...originalLocation, href: 'http://localhost/' } as Location;
    Object.defineProperty(window, 'location', { configurable: true, value: location });
    const handler = (api.interceptors.response as any).handlers[0].rejected;

    localStorage.setItem('token', 'tok123');
    const mcpUnauthorized = { config: { url: '/mcp/server/project-1' }, response: { status: 401 } };
    await expect(handler(mcpUnauthorized)).rejects.toEqual(mcpUnauthorized);
    expect(localStorage.getItem('token')).toBe('tok123');
    expect(signOut).not.toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost/');

    const appUnauthorized = { config: { url: '/users/me' }, response: { status: 401 } };
    await expect(handler(appUnauthorized)).rejects.toEqual(appUnauthorized);
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
    expect(signOut).toHaveBeenCalled();

    localStorage.setItem('token', 'tok456');
    await expect(handler({ response: { status: 500 } })).rejects.toEqual({ response: { status: 500 } });
    expect(localStorage.getItem('token')).toBe('tok456');

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });
});
