import type { PromptTemplate } from '../../data/promptTemplate.interface'
import { fetchCatalogJson } from './fetchCatalogJson.util'

const detailRequests = new Map<string, Promise<PromptTemplate>>()

export function loadPromptTemplate(id: string): Promise<PromptTemplate> {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Invalid prompt template id'))

  let request = detailRequests.get(id)
  if (!request) {
    request = fetchCatalogJson<PromptTemplate>(`prompts/${id}.json`).catch((error) => {
      detailRequests.delete(id)
      throw error
    })
    detailRequests.set(id, request)
  }
  return request
}
