import { useCallback, useEffect, useState } from 'react'
import type { PromptTemplateSummary } from './promptTemplateSummary.interface'
import type { TemplateCatalogState } from './templateCatalogState.interface'
import { loadPromptTemplateIndex } from './loadPromptTemplateIndex.util'

export function usePromptTemplateCatalog(): TemplateCatalogState<PromptTemplateSummary> {
  const [items, setItems] = useState<PromptTemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const reload = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loadPromptTemplateIndex(requestVersion > 0)
      .then((catalog) => {
        if (active) setItems(catalog.items)
      })
      .catch((catalogError: unknown) => {
        if (active) setError(catalogError instanceof Error ? catalogError.message : String(catalogError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [requestVersion])

  return { items, loading, error, reload }
}
