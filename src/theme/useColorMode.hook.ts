import { useContext } from 'react'
import { ColorModeContext } from './colorMode.context'

export function useColorMode() {
  return useContext(ColorModeContext)
}
