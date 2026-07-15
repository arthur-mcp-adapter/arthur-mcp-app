import { useCallback, useEffect, useState } from 'react'
import type { ApiTemplateSummary } from './apiTemplateSummary.interface'
import type { TemplateCatalogState } from './templateCatalogState.interface'
import { loadApiTemplateIndex } from './loadApiTemplateIndex.util'

export function useApiTemplateCatalog(enabled = true): TemplateCatalogState<ApiTemplateSummary> {
  const [items, setItems] = useState<ApiTemplateSummary[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const reload = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    loadApiTemplateIndex(requestVersion > 0)
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
  }, [enabled, requestVersion])

  return { items, loading, error, reload }
}
