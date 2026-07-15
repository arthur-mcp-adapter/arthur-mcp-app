export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: 'error' | 'warning' | 'primary'
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}
