import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'
import type { ConfirmDialogProps } from './confirmDialogProps.interface'


const ICON_MAP = {
  error: <ErrorOutlineIcon sx={{ fontSize: 48, color: '#d93025' }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 48, color: '#f9ab00' }} />,
  primary: <InfoOutlinedIcon sx={{ fontSize: 48, color: '#1a73e8' }} />,
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = 'primary',
  onConfirm,
  onClose,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 0, textAlign: 'center', pt: 3 }}>
        <Box mb={1.5}>{ICON_MAP[confirmColor]}</Box>
        <Typography variant="h6" fontWeight={500} fontSize="1.25rem">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: 4, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          {t('action.cancel')}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ minWidth: 100 }}
        >
          {loading ? t('action.loading') : (confirmLabel ?? t('action.confirm'))}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
