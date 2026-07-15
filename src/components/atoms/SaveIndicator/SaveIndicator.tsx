import { Box, CircularProgress, Typography } from '@mui/material'
import { IconCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { SaveStatus } from '../../../features/server/types'
import type { SaveIndicatorProps } from './saveIndicatorProps.interface'


export function SaveIndicator({ status, error }: SaveIndicatorProps) {
  const { t } = useTranslation('common')
  if (status === 'idle') return null
  if (status === 'saving') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <CircularProgress size={10} />
      <Typography variant="caption" color="text.secondary">{t('action.saving')}</Typography>
    </Box>
  )
  if (status === 'saved') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <IconCheck size={14} />
      <Typography variant="caption" color="success.main">{t('action.saved')}</Typography>
    </Box>
  )
  return <Typography variant="caption" color="error.main">{error || t('error.saveFailed')}</Typography>
}
