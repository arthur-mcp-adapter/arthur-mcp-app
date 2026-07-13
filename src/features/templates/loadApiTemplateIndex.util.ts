import type { TemplateCatalogIndex } from './templateCatalogIndex.interface'
import type { ApiTemplateSummary } from './apiTemplateSummary.interface'
import { fetchCatalogJson } from './fetchCatalogJson.util'

let indexRequest: Promise<TemplateCatalogIndex<ApiTemplateSummary>> | null = null

export function loadApiTemplateIndex(force = false): Promise<TemplateCatalogIndex<ApiTemplateSummary>> {
  if (force) indexRequest = null
  if (!indexRequest) {
    indexRequest = fetchCatalogJson<TemplateCatalogIndex<ApiTemplateSummary>>('api/index.json')
      .catch((error) => {
        indexRequest = null
        throw error
      })
  }
  return indexRequest
}
