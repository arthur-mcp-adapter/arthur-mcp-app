import { useEffect, type DependencyList, type ReactNode } from 'react'
import type { ContextualNavTab, ServerDetailNav } from '../context'
import { useServerNav } from '../context'
import type { DetailPageNavItem } from './detailPageNavItem.interface'
import type { DetailPageNav } from './detailPageNav.interface'

export function useDetailPageNav<T extends ContextualNavTab>(buildDetail: () => DetailPageNav<T> | null, deps: DependencyList) {
  const { setServerDetail } = useServerNav()

  useEffect(() => {
    const detail = buildDetail()
    if (!detail) return
    setServerDetail(detail as unknown as ServerDetailNav)
  }, deps)

  useEffect(() => () => setServerDetail(null), [setServerDetail])
}
