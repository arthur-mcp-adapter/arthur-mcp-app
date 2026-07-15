import { createContext } from 'react'
import type { AuthContextValue } from './authContextValue.interface'

export const AuthContext = createContext<AuthContextValue>({
  me: null,
  loading: true,
  can: () => false,
  isAdmin: false,
  selfHosted: false,
  reload: () => {},
  logout: () => {},
})
