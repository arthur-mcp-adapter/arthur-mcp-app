import { CssBaseline, ThemeProvider } from '@mui/material'
import { useMemo, useState } from 'react'
import { basedarkTheme } from './basedarkTheme.constant'
import { baselightTheme } from './baselightTheme.constant'
import { ColorModeContext } from './colorMode.context'
import { ColorMode } from './colorMode.enum'
import type { ColorModeContextType } from './colorModeContextType.interface'
import type { ColorModeProviderProps } from './colorModeProviderProps.interface'

export function ColorModeProvider({ children }: ColorModeProviderProps) {
  const [mode, setMode] = useState<ColorMode>(() => {
    return (localStorage.getItem('colorMode') as ColorMode) ?? ColorMode.Light
  })

  const ctx = useMemo<ColorModeContextType>(() => ({
    mode,
    toggle: () => {
      setMode((prev) => {
        const next = prev === ColorMode.Light ? ColorMode.Dark : ColorMode.Light
        localStorage.setItem('colorMode', next)
        return next
      })
    },
  }), [mode])

  const theme = mode === ColorMode.Dark ? basedarkTheme : baselightTheme

  return (
    <ColorModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
