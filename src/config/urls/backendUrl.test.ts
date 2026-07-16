import { afterEach, describe, expect, it, vi } from 'vitest'

describe('backendUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses the configured API origin for generated backend URLs', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/')
    const { backendUrl } = await import('./backendUrl.util')

    expect(backendUrl('/api/mcp/server/payments-api')).toBe('https://api.example.com/api/mcp/server/payments-api')
  })

  it('uses the browser origin when the API is same-origin', async () => {
    vi.stubEnv('VITE_API_URL', '')
    const { backendUrl } = await import('./backendUrl.util')

    expect(backendUrl('/api/mcp/server/payments-api')).toBe(`${window.location.origin}/api/mcp/server/payments-api`)
  })
})
