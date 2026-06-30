import { describe, it, expect } from 'vitest'
import {
  API_TEMPLATES,
  SERVER_TEMPLATE_SOURCE_TAG,
  TEMPLATE_CATEGORIES,
  buildToolPayload,
} from './api-templates'
import {
  PROMPT_TEMPLATE_CATEGORIES,
  PROMPT_TEMPLATES,
} from './prompt-templates'

describe('API templates', () => {
  it('defines REST template source tag and sorted categories', () => {
    expect(SERVER_TEMPLATE_SOURCE_TAG).toBe('source:rest')
    expect(TEMPLATE_CATEGORIES[0]).toBe('All')
    expect(TEMPLATE_CATEGORIES.slice(1)).toEqual([...TEMPLATE_CATEGORIES.slice(1)].sort())
  })

  it('keeps every API template complete enough to create a server', () => {
    expect(API_TEMPLATES.length).toBeGreaterThan(5)

    for (const template of API_TEMPLATES) {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.tagline).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.category).toBeTruthy()
      expect(template.baseUrl).toMatch(/^https?:\/\//)
      expect(template.color).toMatch(/^#/)
      expect(template.auth.type).toMatch(/^(none|bearer|api-key|basic)$/)
      expect(template.tools.length).toBeGreaterThan(0)

      for (const tool of template.tools) {
        expect(tool.name).toBeTruthy()
        expect(tool.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE)$/)
        expect(tool.path).toMatch(/^\//)
        for (const param of tool.params) {
          expect(param.name).toBeTruthy()
          expect(param.in).toMatch(/^(path|query|body|header)$/)
          expect(typeof param.required).toBe('boolean')
          expect(param.type).toMatch(/^(string|number|integer|boolean|object|array)$/)
        }
      }
    }
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

describe('prompt templates', () => {
  it('keeps prompt categories unique and populated', () => {
    expect(PROMPT_TEMPLATE_CATEGORIES.length).toBeGreaterThan(5)
    expect(new Set(PROMPT_TEMPLATE_CATEGORIES).size).toBe(PROMPT_TEMPLATE_CATEGORIES.length)
  })

  it('keeps every prompt template complete and categorized', () => {
    expect(PROMPT_TEMPLATES.length).toBeGreaterThan(20)

    for (const template of PROMPT_TEMPLATES) {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.tagline).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(PROMPT_TEMPLATE_CATEGORIES).toContain(template.category)
      expect(template.emoji).toBeTruthy()
      expect(template.tags.length).toBeGreaterThan(0)
      expect(template.content).toContain('{{')
      expect(template.content).toContain('}}')
    }
  })
})
