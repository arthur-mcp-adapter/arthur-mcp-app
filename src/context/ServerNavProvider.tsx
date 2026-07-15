import { useState } from 'react'
import type { ServerDetailNav } from './serverDetailNav.interface'
import { ServerNavContext } from './serverNav.context'
import type { ServerNavProviderProps } from './serverNavProviderProps.interface'

export function ServerNavProvider({ children }: ServerNavProviderProps) {
  const [serverDetail, setServerDetail] = useState<ServerDetailNav | null>(null)
  return (
    <ServerNavContext.Provider value={{ serverDetail, setServerDetail }}>
      {children}
    </ServerNavContext.Provider>
  )
}
