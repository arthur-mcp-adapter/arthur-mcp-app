import { describe, it, expect, beforeEach } from 'vitest';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('attaches request interceptor that reads token from localStorage', async () => {
    const { default: api } = await import('./api');
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;

    localStorage.setItem('token', 'tok123');
    expect(handler({ headers: {} })).toMatchObject({ headers: { Authorization: 'Bearer tok123' } });

    localStorage.clear();
    expect(handler({ headers: {} })).toEqual({ headers: {} });
  });

  it('attaches response interceptor for 401 handling', async () => {
    const { default: api } = await import('./api');
    const originalLocation = window.location;
    const location = { ...originalLocation, href: 'http://localhost/' } as Location;
    Object.defineProperty(window, 'location', { configurable: true, value: location });
    const handler = (api.interceptors.response as any).handlers[0].rejected;

    localStorage.setItem('token', 'tok123');
    await expect(handler({ response: { status: 401 } })).rejects.toEqual({ response: { status: 401 } });
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');

    localStorage.setItem('token', 'tok456');
    await expect(handler({ response: { status: 500 } })).rejects.toEqual({ response: { status: 500 } });
    expect(localStorage.getItem('token')).toBe('tok456');

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });
});
