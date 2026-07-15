import { createContext } from 'react'
import { ColorMode } from './colorMode.enum'
import type { ColorModeContextType } from './colorModeContextType.interface'

export const ColorModeContext = createContext<ColorModeContextType>({
  mode: ColorMode.Light,
  toggle: () => {},
})
