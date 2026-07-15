import type { ApiTemplate } from '../../data/apiTemplate.interface'
import { fetchCatalogJson } from './fetchCatalogJson.util'

const detailRequests = new Map<string, Promise<ApiTemplate>>()

export function loadApiTemplate(id: string): Promise<ApiTemplate> {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Invalid API template id'))

  let request = detailRequests.get(id)
  if (!request) {
    request = fetchCatalogJson<ApiTemplate>(`api/${id}.json`).catch((error) => {
      detailRequests.delete(id)
      throw error
    })
    detailRequests.set(id, request)
  }
  return request
}
