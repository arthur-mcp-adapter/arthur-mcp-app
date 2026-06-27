import { Box, CircularProgress, Typography } from '@mui/material'
import { IconCheck } from '@tabler/icons-react'
import type { SaveStatus } from '../features/server/types'

export function SaveIndicator({ status, error }: { status: SaveStatus; error?: string }) {
  if (status === 'idle') return null
  if (status === 'saving') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <CircularProgress size={10} />
      <Typography variant="caption" color="text.secondary">Saving…</Typography>
    </Box>
  )
  if (status === 'saved') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <IconCheck size={14} />
      <Typography variant="caption" color="success.main">Saved</Typography>
    </Box>
  )
  return <Typography variant="caption" color="error.main">{error || 'Failed to save.'}</Typography>
}
