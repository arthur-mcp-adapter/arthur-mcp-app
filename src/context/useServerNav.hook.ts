import { useContext } from 'react'
import { ServerNavContext } from './serverNav.context'

export function useServerNav() {
  return useContext(ServerNavContext)
}
