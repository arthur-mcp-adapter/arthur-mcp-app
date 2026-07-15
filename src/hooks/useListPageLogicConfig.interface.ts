import type { Permission } from '../context/auth'

export interface UseListPageLogicConfig<T> {
  /** Load items from API */
  loadItems: () => Promise<T[]>
  /** Delete item from API */
  deleteItem: (id: string) => Promise<void>
  /** Permission to check before loading */
  permission: Permission
  /** Extract ID from item (default: item.id) */
  getItemId?: (item: T) => string
  /** Callback after successful deletion */
  onItemDeleted?: (item: T) => void
}
