import { createContext } from 'react'
import type { ServerNavContextValue } from './serverNavContextValue.interface'

export const ServerNavContext = createContext<ServerNavContextValue>({
  serverDetail: null,
  setServerDetail: () => {},
})
