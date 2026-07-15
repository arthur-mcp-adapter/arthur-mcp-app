import { createTheme } from '@mui/material/styles'
import { baselightTheme } from './baselightTheme.constant'

export const basedarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8ab4f8',
      light: 'rgba(138,180,248,0.12)',
      dark: '#669df6',
    },
    secondary: {
      main: '#81d4fa',
      light: 'rgba(129,212,250,0.12)',
      dark: '#4fc3f7',
    },
    success: {
      main: '#81c995',
      light: 'rgba(129,201,149,0.12)',
      dark: '#5bb974',
      contrastText: '#202124',
    },
    info: {
      main: '#8ab4f8',
      light: 'rgba(138,180,248,0.12)',
      dark: '#669df6',
      contrastText: '#202124',
    },
    error: {
      main: '#f28b82',
      light: 'rgba(242,139,130,0.12)',
      dark: '#ee675c',
      contrastText: '#202124',
    },
    warning: {
      main: '#fdd663',
      light: 'rgba(253,214,99,0.12)',
      dark: '#f9a825',
      contrastText: '#202124',
    },
    grey: {
      100: '#3c4043',
      200: '#303134',
      300: '#5f6368',
      400: '#9aa0a6',
      500: '#bdc1c6',
      600: '#e8eaed',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#9aa0a6',
    },
    action: {
      disabledBackground: 'rgba(255,255,255,0.12)',
      hoverOpacity: 0.08,
      hover: 'rgba(138,180,248,0.08)',
    },
    divider: '#3c4043',
    background: {
      default: '#202124',
      paper: '#292a2d',
    },
  },
  typography: baselightTheme.typography,
  shape: baselightTheme.shape,
  components: {
    ...baselightTheme.components,
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: 'none',
          borderColor: '#3c4043',
          backgroundColor: '#292a2d',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: '#3c4043',
          borderRadius: '12px',
          backgroundColor: '#292a2d',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          backgroundColor: '#292a2d',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        sizeMedium: { padding: '8px 20px', fontSize: '0.875rem' },
        sizeSmall: { padding: '5px 14px', fontSize: '0.8125rem' },
        containedPrimary: {
          backgroundColor: '#8ab4f8',
          color: '#202124',
          '&:hover': { backgroundColor: '#aecbfa' },
        },
        outlinedPrimary: {
          borderColor: '#3c4043',
          color: '#8ab4f8',
          '&:hover': {
            backgroundColor: 'rgba(138,180,248,0.08)',
            borderColor: '#8ab4f8',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': { borderColor: '#5f6368' },
            '&:hover fieldset': { borderColor: '#9aa0a6' },
            '&.Mui-focused fieldset': { borderColor: '#8ab4f8', borderWidth: '2px' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: '#8ab4f8' },
        },
      },
    },
    MuiDialog: {
      defaultProps: { PaperProps: { elevation: 3 } },
      styleOverrides: {
        paper: {
          borderRadius: '28px',
          backgroundColor: '#35363a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.375rem',
          fontWeight: 400,
          padding: '24px 24px 12px',
          color: '#e8eaed',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px 20px',
          '&.MuiDialogContent-dividers': {
            borderColor: '#3c4043',
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
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: '12px', fontSize: '0.875rem' },
        standardError: { backgroundColor: 'rgba(242,139,130,0.12)', color: '#f28b82' },
        standardSuccess: { backgroundColor: 'rgba(129,201,149,0.12)', color: '#81c995' },
        standardWarning: { backgroundColor: 'rgba(253,214,99,0.12)', color: '#fdd663' },
        standardInfo: { backgroundColor: 'rgba(138,180,248,0.12)', color: '#8ab4f8' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
          padding: '4px 0',
          backgroundColor: '#35363a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        },
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
            backgroundColor: 'rgba(138,180,248,0.16)',
            '&:hover': { backgroundColor: 'rgba(138,180,248,0.20)' },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: '8px',
          backgroundColor: '#5f6368',
          padding: '6px 10px',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: '4px', backgroundColor: '#3c4043' },
        bar: { borderRadius: '4px', backgroundColor: '#8ab4f8' },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#3c4043' } },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#8ab4f8', height: '3px', borderRadius: '3px 3px 0 0' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textTransform: 'none',
          minHeight: '40px',
          fontSize: '0.875rem',
          color: '#9aa0a6',
          '&.Mui-selected': { color: '#8ab4f8', fontWeight: 600 },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: '#8ab4f8' },
          '&.Mui-completed': { color: '#81c995' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: '#e8eaed',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5f6368' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9aa0a6' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8ab4f8', borderWidth: '2px' },
          '& input': { color: '#e8eaed' },
          '& textarea': { color: '#e8eaed' },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#9aa0a6',
          '&.Mui-focused': { color: '#8ab4f8' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: '#9aa0a6' },
        select: { color: '#e8eaed' },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: '#35363a',
          border: '1px solid #3c4043',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        },
        listbox: { backgroundColor: '#35363a', padding: '4px' },
        option: {
          borderRadius: '8px',
          '&[aria-selected="true"]': { backgroundColor: 'rgba(138,180,248,0.16) !important' },
          '&.Mui-focused': { backgroundColor: 'rgba(138,180,248,0.08)' },
        },
        noOptions: { color: '#9aa0a6', backgroundColor: '#35363a' },
        loading: { color: '#9aa0a6', backgroundColor: '#35363a' },
        clearIndicator: { color: '#9aa0a6' },
        popupIndicator: { color: '#9aa0a6' },
        endAdornment: { color: '#9aa0a6' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: '8px', fontWeight: 500 },
        sizeSmall: { height: '22px', fontSize: '0.72rem' },
        outlined: { borderColor: '#5f6368', color: '#bdc1c6' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#3c4043', color: '#e8eaed' },
        head: {
          fontWeight: 500,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#9aa0a6',
          backgroundColor: '#35363a',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#8ab4f8' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#8ab4f8' },
        },
      },
    },
  },
})
