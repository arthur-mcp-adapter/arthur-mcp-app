export interface TemplateCatalogState<T> {
  items: T[]
  loading: boolean
  error: string | null
  reload: () => void
}
