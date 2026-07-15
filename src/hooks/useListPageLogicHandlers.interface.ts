export interface UseListPageLogicHandlers<T> {
  setItems: (items: T[]) => void
  setSearch: (search: string) => void
  setSnack: (snack: { message: string; severity: 'success' | 'error' } | null) => void
  handleDeleteRequest: (item: T) => void
  handleDeleteCancel: () => void
  handleDeleteConfirm: () => Promise<void>
}
