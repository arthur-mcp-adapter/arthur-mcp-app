import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadApiTemplate } from './loadApiTemplate.util'
import { loadPromptTemplate } from './loadPromptTemplate.util'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('template detail loaders', () => {
  it('loads and caches an API template detail by id', async () => {
    const detail = { id: 'test-api-template', name: 'Test API' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(detail), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadApiTemplate('test-api-template')).resolves.toEqual(detail)
    await expect(loadApiTemplate('test-api-template')).resolves.toEqual(detail)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/catalogs/api/test-api-template.json')
  })

  it('loads and caches a prompt template detail by id', async () => {
    const detail = { id: 'test-prompt-template', name: 'Test Prompt' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(detail), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPromptTemplate('test-prompt-template')).resolves.toEqual(detail)
    await expect(loadPromptTemplate('test-prompt-template')).resolves.toEqual(detail)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/catalogs/prompts/test-prompt-template.json')
  })

  it('rejects unsafe ids without making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadApiTemplate('../private')).rejects.toThrow('Invalid API template id')
    await expect(loadPromptTemplate('prompt/name')).rejects.toThrow('Invalid prompt template id')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
