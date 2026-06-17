import { createTheme } from '@mui/material/styles'

export const STATUS_COLORS = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  inactive: '#94a3b8',
} as const

const baselightTheme = createTheme({
  palette: {
    primary: {
      main: '#5D87FF',
      light: '#ECF2FF',
      dark: '#4570EA',
    },
    secondary: {
      main: '#49BEFF',
      light: '#E8F7FF',
      dark: '#23afdb',
    },
    success: {
      main: '#13DEB9',
      light: '#E6FFFA',
      dark: '#02b3a9',
      contrastText: '#ffffff',
    },
    info: {
      main: '#539BFF',
      light: '#EBF3FE',
      dark: '#1682d4',
      contrastText: '#ffffff',
    },
    error: {
      main: '#FA896B',
      light: '#FDEDE8',
      dark: '#f3704d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#FFAE1F',
      light: '#FEF5E5',
      dark: '#ae8e59',
      contrastText: '#ffffff',
    },
    grey: {
      100: '#F2F6FA',
      200: '#EAEFF4',
      300: '#DFE5EF',
      400: '#7C8FAC',
      500: '#5A6A85',
      600: '#2A3547',
    },
    text: {
      primary: '#2A3547',
      secondary: '#5A6A85',
    },
    action: {
      disabledBackground: 'rgba(73,82,88,0.12)',
      hoverOpacity: 0.02,
      hover: '#f6f9fc',
    },
    divider: '#e5eaef',
    background: {
      default: '#F2F6FA',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
    h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: '2.75rem', letterSpacing: '-0.5px' },
    h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.4px' },
    h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: '1.75rem', letterSpacing: '-0.3px' },
    h4: { fontWeight: 700, fontSize: '1.3125rem', lineHeight: '1.6rem', letterSpacing: '-0.2px' },
    h5: { fontWeight: 700, fontSize: '1.125rem', lineHeight: '1.6rem', letterSpacing: '-0.2px' },
    h6: { fontWeight: 700, fontSize: '1rem', lineHeight: '1.2rem' },
    subtitle1: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: '1.5rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.875rem', lineHeight: '1.375rem' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.5rem' },
    body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: '1.375rem' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: '1.25rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.MuiPaper-elevation9, .MuiPopover-root .MuiPaper-elevation': {
          boxShadow:
            'rgb(145 158 171 / 20%) 0px 0px 2px 0px, rgb(145 158 171 / 10%) 0px 8px 20px -4px !important',
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: '10px',
          boxShadow: 'none',
          transition: 'border-color 0.15s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: '#e5eaef',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        sizeMedium: { padding: '6px 16px' },
        sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': { borderColor: '#dde3ec' },
            '&:hover fieldset': { borderColor: '#5D87FF' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 600,
        },
        sizeSmall: { height: '22px', fontSize: '0.72rem' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textTransform: 'none',
          minHeight: '40px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e5eaef',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#5A6A85',
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: '8px' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: '8px', fontSize: '0.875rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: '12px' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: '6px',
        },
      },
    },
  },
})

export default baselightTheme
