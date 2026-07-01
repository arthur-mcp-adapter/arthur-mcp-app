import { createContext, useContext, useState, type ReactNode } from 'react'

export type ContextualNavTab = number | string

export interface ServerNavItem {
  label: string
  icon: ReactNode
  idx: ContextualNavTab
  badge?: number
  disabled?: boolean
}

export interface ServerDetailNav {
  name: string
  sourceEmoji: string
  sourceColor: string
  navItems: ServerNavItem[]
  tab: ContextualNavTab
  onTabChange: (n: ContextualNavTab) => void
  backLabel?: string
  backPath?: string
}

interface ServerNavContextValue {
  serverDetail: ServerDetailNav | null
  setServerDetail: (detail: ServerDetailNav | null) => void
}

const ServerNavContext = createContext<ServerNavContextValue>({
  serverDetail: null,
  setServerDetail: () => {},
})

export function ServerNavProvider({ children }: { children: ReactNode }) {
  const [serverDetail, setServerDetail] = useState<ServerDetailNav | null>(null)
  return (
    <ServerNavContext.Provider value={{ serverDetail, setServerDetail }}>
      {children}
    </ServerNavContext.Provider>
  )
}

export function useServerNav() {
  return useContext(ServerNavContext)
}
