import { describe, expect, it } from 'vitest'
import { SERVER_TEMPLATE_SOURCE_TAG } from './serverTemplateSourceTag.constant'
import { buildToolPayload } from './utils/buildToolPayload.util'

describe('template server payloads', () => {
  it('defines the REST template source tag', () => {
    expect(SERVER_TEMPLATE_SOURCE_TAG).toBe('source:rest')
  })

  it('builds tool payloads with parameter maps and required schema fields', () => {
    const payload = buildToolPayload({
      name: 'create_user',
      description: 'Create user',
      method: 'POST',
      path: '/users/{id}',
      params: [
        { name: 'userId', originalName: 'id', in: 'path', required: true, type: 'string', description: 'User id' },
        { name: 'verbose', in: 'query', required: false, type: 'boolean', description: 'Verbose response' },
      ],
    }, 'https://api.example.com')

    expect(payload).toEqual({
      name: 'create_user',
      description: 'Create user',
      method: 'POST',
      path: '/users/{id}',
      baseUrl: 'https://api.example.com',
      contentType: 'application/json',
      parameterMap: [
        { toolParamName: 'userId', source: 'path', originalName: 'id', required: true },
        { toolParamName: 'verbose', source: 'query', originalName: 'verbose', required: false },
      ],
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User id' },
          verbose: { type: 'boolean', description: 'Verbose response' },
        },
        required: ['userId'],
      },
    })
  })

  it('omits required schema when no parameters are required', () => {
    const payload = buildToolPayload({
      name: 'search',
      description: 'Search',
      method: 'GET',
      path: '/search',
      params: [{ name: 'q', in: 'query', required: false, type: 'string', description: '' }],
    }, 'https://api.example.com')

    expect(payload.inputSchema).toEqual({
      type: 'object',
      properties: { q: { type: 'string' } },
    })
  })
})
