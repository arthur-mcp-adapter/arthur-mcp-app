import type { ColorMode } from './colorMode.enum'

export interface ColorModeContextType {
  mode: ColorMode
  toggle: () => void
}
