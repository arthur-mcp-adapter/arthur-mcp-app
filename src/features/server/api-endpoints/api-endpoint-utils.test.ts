import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildCurl, buildMcpCurl, inferSchema, emptyHeader, emptyParam, toolToFormState } from './utils'
import type { GeneratedTool } from '../types'

const tool: GeneratedTool = {
  id: 'tool-1',
  name: 'getUser',
  description: 'Get a user',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'integer', description: 'User id' },
      include: { type: 'string' },
      token: { type: 'string' },
      payload: { type: 'object' },
    },
  },
  endpointRef: {
    method: 'POST',
    baseUrl: 'https://api.example.com',
    path: '/users/{id}',
    contentType: 'application/json',
    parameterMap: [
      { toolParamName: 'userId', source: 'path', originalName: 'id', required: true },
      { toolParamName: 'include', source: 'query', originalName: 'include', required: false },
      { toolParamName: 'token', source: 'header', originalName: 'Authorization', required: true },
      { toolParamName: 'payload', source: 'body', originalName: 'body', required: true },
    ],
    staticHeaders: [{ name: 'x-client', value: 'arthur' }],
  } as GeneratedTool['endpointRef'] & { staticHeaders: { name: string; value: string }[] },
  outputTemplate: '{{json}}',
}

describe('api endpoint utility helpers', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
  })

  it('builds HTTP curl commands with path, query, header, and body params', () => {
    expect(buildCurl(tool)).toBe([
      'curl -X POST "https://api.example.com/users/<userId>?include=<include>" \\',
      "  -H 'Content-Type: application/json' \\",
      "  -H 'Authorization: <token>' \\",
      `  -d '${JSON.stringify({ payload: '<object>' })}'`,
    ].join('\n'))
  })

  it('omits request body headers for GET curl commands', () => {
    const getTool: GeneratedTool = {
      ...tool,
      endpointRef: { ...tool.endpointRef, method: 'GET', parameterMap: [] },
    }

    expect(buildCurl(getTool)).toBe('curl -X GET "https://api.example.com/users/{id}"')
  })

  it('builds MCP curl commands with optional API key header', () => {
    vi.stubGlobal('location', { origin: 'https://app.example.com' })

    expect(buildMcpCurl(tool, 'payments-api', true)).toContain('/api/mcp/server/payments-api')
    expect(buildMcpCurl(tool, 'payments-api', true)).toContain("-H 'auth: <your-api-key>'")
    expect(buildMcpCurl(tool, 'payments-api', true)).toContain('"name": "getUser"')
    expect(buildMcpCurl(tool, 'payments-api', false)).not.toContain('your-api-key')
  })

  it('infers JSON schemas from sample values', () => {
    expect(inferSchema(null)).toEqual({ type: 'string' })
    expect(inferSchema(undefined)).toEqual({ type: 'string' })
    expect(inferSchema(true)).toEqual({ type: 'boolean' })
    expect(inferSchema(1)).toEqual({ type: 'integer' })
    expect(inferSchema(1.5)).toEqual({ type: 'number' })
    expect(inferSchema('hello')).toEqual({ type: 'string' })
    expect(inferSchema([])).toEqual({ type: 'array', items: {} })
    expect(inferSchema([{ id: 1 }])).toEqual({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' } } } })
    expect(inferSchema({ name: 'Ada', active: true })).toEqual({
      type: 'object',
      properties: { name: { type: 'string' }, active: { type: 'boolean' } },
    })
  })

  it('creates empty form rows with default values', () => {
    expect(emptyParam()).toEqual({
      id: '4fzzzxjylrx',
      toolParamName: '',
      source: 'query',
      originalName: '',
      required: false,
      type: 'string',
      description: '',
    })
    expect(emptyHeader()).toEqual({ id: '4fzzzxjylrx', name: '', value: '' })
  })

  it('converts tools to form state and returns empty defaults', () => {
    expect(toolToFormState(undefined)).toEqual({
      name: '',
      description: '',
      method: 'GET',
      path: '/',
      contentType: 'application/json',
      params: [],
      staticHeaders: [],
      useOutputTemplate: false,
      outputTemplate: '',
    })

    expect(toolToFormState(tool)).toMatchObject({
      name: 'getUser',
      description: 'Get a user',
      method: 'POST',
      path: '/users/{id}',
      contentType: 'application/json',
      params: [
        expect.objectContaining({ toolParamName: 'userId', source: 'path', type: 'integer', description: 'User id' }),
        expect.objectContaining({ toolParamName: 'include', source: 'query', type: 'string' }),
        expect.objectContaining({ toolParamName: 'token', source: 'header', type: 'string' }),
        expect.objectContaining({ toolParamName: 'payload', source: 'body', type: 'object' }),
      ],
      staticHeaders: [expect.objectContaining({ name: 'x-client', value: 'arthur' })],
      useOutputTemplate: true,
      outputTemplate: '{{json}}',
    })
  })
})
