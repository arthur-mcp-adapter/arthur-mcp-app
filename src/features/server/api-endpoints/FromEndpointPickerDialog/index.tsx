import { useState } from 'react'
import {
  Box, InputAdornment, Paper, TextField, Typography,
} from '@mui/material'
import { IconSearch } from '@tabler/icons-react'
import { BaseDialogLayout } from '../../../../components'
import type { GeneratedTool } from '../../types'
import { METHOD_COLOR } from '../../constants'

export function FromEndpointPickerDialog({ open, tools, onPick, onClose, onBlank, title = 'Create tool from endpoint', description = "Select an endpoint to pre-fill the tool form with its HTTP details. You'll only need to fill in the tool name and description." }: {
  open: boolean
  tools: GeneratedTool[]
  onPick: (tool: GeneratedTool) => void
  onClose: () => void
  onBlank?: () => void
  title?: string
  description?: string
}) {
  const [search, setSearch] = useState('')
  const filtered = tools.filter((t) => {
    const q = search.toLowerCase()
    return !q || t.endpointRef?.path?.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  })

  return (
    <BaseDialogLayout
      open={open}
      onClose={onClose}
      title={title}
      width={460}
      description={description}
    >
      <Box>
        <TextField
          size="small" fullWidth placeholder="Search by path or name…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <Box display="flex" flexDirection="column" gap={0.75} pt={1}>
          {tools.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.disabled">No endpoints defined yet.</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.disabled">No endpoints match your search.</Typography>
            </Box>
          ) : (
            filtered.map((t) => (
              <Paper key={t.name} variant="outlined" sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                transition: 'border-color 0.15s',
              }} onClick={() => onPick(t)}>
                <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                  <Box sx={{
                    minWidth: 48, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                    fontSize: '0.68rem', color: METHOD_COLOR[t.endpointRef?.method ?? ''] ?? '#888',
                    bgcolor: 'action.selected', borderRadius: '4px', px: 0.75, py: 0.25,
                  }}>
                    {t.endpointRef?.method ?? '?'}
                  </Box>
                  <Typography fontFamily="monospace" fontSize="0.82rem" noWrap flexGrow={1}>
                    {t.endpointRef?.path ?? '/'}
                  </Typography>
                </Box>
                {t.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, pl: '56px' }} noWrap>
                    {t.description}
                  </Typography>
                )}
              </Paper>
            ))
          )}
          {onBlank && (
            <Paper variant="outlined" sx={{
              px: 2, py: 1.5, cursor: 'pointer',
              borderStyle: 'dashed',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              transition: 'border-color 0.15s',
            }} onClick={onBlank}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{
                  minWidth: 48, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.68rem', color: 'text.disabled',
                  bgcolor: 'action.selected', borderRadius: '4px', px: 0.75, py: 0.25,
                }}>
                  —
                </Box>
                <Box>
                  <Typography fontSize="0.82rem" fontWeight={600}>Blank resource</Typography>
                  <Typography variant="caption" color="text.secondary">Static content — write the HTML manually</Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </BaseDialogLayout>
  )
}
