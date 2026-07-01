import { useEffect, useState } from 'react'
import { useAuth, Permission } from '../context/AuthContext'
import api from '../api'

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

export interface UseListPageLogicState<T> {
  items: T[]
  loading: boolean
  search: string
  deleteTarget: T | null
  deleting: boolean
  snack: { message: string; severity: 'success' | 'error' } | null
}

export interface UseListPageLogicHandlers<T> {
  setItems: (items: T[]) => void
  setSearch: (search: string) => void
  setSnack: (snack: { message: string; severity: 'success' | 'error' } | null) => void
  handleDeleteRequest: (item: T) => void
  handleDeleteCancel: () => void
  handleDeleteConfirm: () => Promise<void>
}

/**
 * Generic hook to manage list page state and handlers.
 * Eliminates repeated patterns in Prompts, Secrets, Servers pages.
 */
export function useListPageLogic<T>({
  loadItems,
  deleteItem,
  permission,
  getItemId = (item: any) => item.id,
  onItemDeleted,
}: UseListPageLogicConfig<T>): [UseListPageLogicState<T>, UseListPageLogicHandlers<T>] {
  const { can, loading: authLoading } = useAuth()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)

  // Load items on mount, respecting auth and permissions
  useEffect(() => {
    if (authLoading) return
    if (!can(permission)) {
      setLoading(false)
      return
    }

    setLoading(true)
    loadItems()
      .then((data) => setItems(data))
      .catch(() => setSnack({ message: 'error.loadFailed', severity: 'error' }))
      .finally(() => setLoading(false))
  }, [authLoading, permission])

  const handleDeleteRequest = (item: T) => {
    setDeleteTarget(item)
  }

  const handleDeleteCancel = () => {
    setDeleteTarget(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const id = getItemId(deleteTarget)
      await deleteItem(id)
      setItems((prev) => prev.filter((item) => getItemId(item) !== id))
      setSnack({ message: 'toast.deleted', severity: 'success' })
      onItemDeleted?.(deleteTarget)
      setDeleteTarget(null)
    } catch {
      setSnack({ message: 'error.deleteFailed', severity: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const state: UseListPageLogicState<T> = {
    items,
    loading,
    search,
    deleteTarget,
    deleting,
    snack,
  }

  const handlers: UseListPageLogicHandlers<T> = {
    setItems,
    setSearch,
    setSnack,
    handleDeleteRequest,
    handleDeleteCancel,
    handleDeleteConfirm,
  }

  return [state, handlers]
}
