import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import HelpIcon from '@mui/icons-material/Help'
import { useTranslation } from 'react-i18next'
import type { HelpButtonProps } from './helpButtonProps.interface'


export default function HelpButton({ title, children }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  return (
    <>
      <Tooltip title={t('action.learnMore')}>
        <IconButton size="small" aria-label={t('action.learnMore')} onClick={() => setOpen(true)}
          sx={{
            p: 0.4,
            '&:hover': { bgcolor: 'primary' },
          }}>
          <HelpIcon color="primary" fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <HelpIcon color="primary" fontSize="small" />
          <Typography component="span" variant="subtitle1" fontWeight={700}>{title}</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ lineHeight: 1.6 }}>{children}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('action.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
