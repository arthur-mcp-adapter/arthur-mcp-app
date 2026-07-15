import { createTheme } from '@mui/material/styles'

export const baselightTheme = createTheme({
  palette: {
    primary: {
      main: '#1a73e8',
      light: '#e8f0fe',
      dark: '#1557b0',
    },
    secondary: {
      main: '#49BEFF',
      light: '#E8F7FF',
      dark: '#23afdb',
    },
    success: {
      main: '#1e8e3e',
      light: '#e6f4ea',
      dark: '#137333',
      contrastText: '#ffffff',
    },
    info: {
      main: '#1a73e8',
      light: '#e8f0fe',
      dark: '#1557b0',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d93025',
      light: '#fce8e6',
      dark: '#b3261e',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f9ab00',
      light: '#fef7e0',
      dark: '#e37400',
      contrastText: '#ffffff',
    },
    grey: {
      100: '#f8f9fa',
      200: '#f1f3f4',
      300: '#e8eaed',
      400: '#9aa0a6',
      500: '#5f6368',
      600: '#3c4043',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    action: {
      disabledBackground: 'rgba(0,0,0,0.08)',
      hoverOpacity: 0.04,
      hover: 'rgba(26,115,232,0.04)',
    },
    divider: '#e8eaed',
    background: {
      default: '#f1f3f4',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Google Sans', 'Plus Jakarta Sans', Roboto, Arial, sans-serif",
    h1: { fontWeight: 400, fontSize: '2.25rem', lineHeight: '2.75rem', letterSpacing: '-0.5px' },
    h2: { fontWeight: 400, fontSize: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.4px' },
    h3: { fontWeight: 500, fontSize: '1.5rem', lineHeight: '1.75rem', letterSpacing: '-0.3px' },
    h4: { fontWeight: 500, fontSize: '1.3125rem', lineHeight: '1.6rem', letterSpacing: '-0.2px' },
    h5: { fontWeight: 500, fontSize: '1.125rem', lineHeight: '1.6rem', letterSpacing: '-0.1px' },
    h6: { fontWeight: 500, fontSize: '1rem', lineHeight: '1.5rem' },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem', lineHeight: '1.5rem' },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: '1.375rem' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.5rem' },
    body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: '1.375rem' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: '1.25rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.MuiPaper-elevation9, .MuiPopover-root .MuiPaper-elevation': {
          boxShadow:
            '0 1px 2px rgba(60,64,67,0.3), 0 2px 6px rgba(60,64,67,0.15) !important',
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: 'none',
          borderColor: '#e8eaed',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: '#e8eaed',
          borderRadius: '12px',
        },
        elevation1: {
          boxShadow: '0 1px 2px rgba(60,64,67,0.3), 0 1px 3px rgba(60,64,67,0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          fontWeight: 500,
          boxShadow: 'none',
          letterSpacing: '0.01em',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        sizeMedium: { padding: '8px 20px', fontSize: '0.875rem' },
        sizeSmall: { padding: '5px 14px', fontSize: '0.8125rem' },
        containedPrimary: {
          backgroundColor: '#1a73e8',
          '&:hover': { backgroundColor: '#1557b0' },
        },
        outlinedPrimary: {
          borderColor: '#dadce0',
          color: '#1a73e8',
          '&:hover': {
            backgroundColor: 'rgba(26,115,232,0.04)',
            borderColor: '#1a73e8',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': { borderColor: '#dadce0' },
            '&:hover fieldset': { borderColor: '#5f6368' },
            '&.Mui-focused fieldset': { borderColor: '#1a73e8', borderWidth: '2px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: '#1a73e8' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: '8px',
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        PaperProps: {
          elevation: 3,
        },
      },
      styleOverrides: {
        paper: {
          borderRadius: '28px',
          boxShadow: '0 6px 24px rgba(60,64,67,0.2), 0 2px 8px rgba(60,64,67,0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.375rem',
          fontWeight: 400,
          padding: '24px 24px 12px',
          letterSpacing: '0',
          color: '#202124',
          lineHeight: '1.75rem',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px 20px',
          '&.MuiDialogContent-dividers': {
            borderColor: '#e8eaed',
            padding: '16px 24px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '8px 24px 20px',
          gap: '8px',
          '& > :not(:first-of-type)': { marginLeft: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
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
          color: '#5f6368',
          '&.Mui-selected': { color: '#1a73e8', fontWeight: 600 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#1a73e8', height: '3px', borderRadius: '3px 3px 0 0' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e8eaed',
        },
        head: {
          fontWeight: 500,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#5f6368',
          backgroundColor: '#f8f9fa',
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
        root: { borderRadius: '12px', fontSize: '0.875rem' },
        standardError: { backgroundColor: '#fce8e6', color: '#c5221f', '& .MuiAlert-icon': { color: '#c5221f' } },
        standardSuccess: { backgroundColor: '#e6f4ea', color: '#137333', '& .MuiAlert-icon': { color: '#137333' } },
        standardWarning: { backgroundColor: '#fef7e0', color: '#b06000', '& .MuiAlert-icon': { color: '#b06000' } },
        standardInfo: { backgroundColor: '#e8f0fe', color: '#1557b0', '& .MuiAlert-icon': { color: '#1557b0' } },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: '8px',
          backgroundColor: '#3c4043',
          padding: '6px 10px',
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {},
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.8125rem',
          fontWeight: 400,
          '&.Mui-active': { fontWeight: 600, color: '#1a73e8' },
          '&.Mui-completed': { color: '#1e8e3e' },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: '#1a73e8' },
          '&.Mui-completed': { color: '#1e8e3e' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .Mui-checked + .MuiSwitch-track': { opacity: 0.5 },
        },
        switchBase: {
          '&.Mui-checked': { color: '#1a73e8' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1a73e8' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: '4px', backgroundColor: '#e8eaed' },
        bar: { borderRadius: '4px', backgroundColor: '#1a73e8' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e8eaed' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '0 8px',
          width: 'calc(100% - 16px)',
          fontSize: '0.875rem',
          '&.Mui-selected': {
            backgroundColor: 'rgba(26,115,232,0.08)',
            '&:hover': { backgroundColor: 'rgba(26,115,232,0.12)' },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
          padding: '4px 0',
          boxShadow: '0 2px 10px rgba(60,64,67,0.2), 0 0 2px rgba(60,64,67,0.1)',
        },
      },
    },
  },
})
