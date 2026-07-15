export interface UseListPageLogicState<T> {
  items: T[]
  loading: boolean
  search: string
  deleteTarget: T | null
  deleting: boolean
  snack: { message: string; severity: 'success' | 'error' } | null
}
