import { useEffect, type DependencyList, type ReactNode } from 'react'
import type { ContextualNavTab, ServerDetailNav } from '../context/ServerNavContext'
import { useServerNav } from '../context/ServerNavContext'

export interface DetailPageNavItem<T extends ContextualNavTab = ContextualNavTab> {
  label: string
  icon: ReactNode
  idx: T
  badge?: number
  disabled?: boolean
}

export interface DetailPageNav<T extends ContextualNavTab = ContextualNavTab> {
  name: string
  sourceEmoji: string
  sourceColor: string
  navItems: DetailPageNavItem<T>[]
  tab: T
  onTabChange: (n: T) => void
  backLabel?: string
  backPath?: string
}

export function useDetailPageNav<T extends ContextualNavTab>(buildDetail: () => DetailPageNav<T> | null, deps: DependencyList) {
  const { setServerDetail } = useServerNav()

  useEffect(() => {
    const detail = buildDetail()
    if (!detail) return
    setServerDetail(detail as unknown as ServerDetailNav)
  }, deps)

  useEffect(() => () => setServerDetail(null), [setServerDetail])
}