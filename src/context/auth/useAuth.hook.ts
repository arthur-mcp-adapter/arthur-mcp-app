import { useContext } from 'react'
import { AuthContext } from './authContext.context'

export function useAuth() {
  return useContext(AuthContext)
}
