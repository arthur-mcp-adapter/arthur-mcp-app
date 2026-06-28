import type { ReactNode } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material'
import { IconX } from '@tabler/icons-react'

export function BaseDialogLayout({
  open,
  onClose,
  title,
  titleIcon,
  description,
  children,
  footer,
  anchor = 'right',
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  titleIcon?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  anchor?: 'left' | 'right'
  width?: number
}) {
  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: width }, display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {titleIcon}
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{title}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>

      {description && (
        <Box sx={{ px: 3, pt: 2, pb: 1, flexShrink: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {children}
      </Box>

      {footer && (
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          {footer}
        </Box>
      )}
    </Drawer>
  )
}