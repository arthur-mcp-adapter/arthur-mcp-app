import type { TemplateCatalogIndex } from './templateCatalogIndex.interface'
import type { PromptTemplateSummary } from './promptTemplateSummary.interface'
import { fetchCatalogJson } from './fetchCatalogJson.util'

let indexRequest: Promise<TemplateCatalogIndex<PromptTemplateSummary>> | null = null

export function loadPromptTemplateIndex(force = false): Promise<TemplateCatalogIndex<PromptTemplateSummary>> {
  if (force) indexRequest = null
  if (!indexRequest) {
    indexRequest = fetchCatalogJson<TemplateCatalogIndex<PromptTemplateSummary>>('prompts/index.json')
      .catch((error) => {
        indexRequest = null
        throw error
      })
  }
  return indexRequest
}
