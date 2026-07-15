import { useEffect, useState } from 'react'
import {
  Box, CircularProgress, IconButton, InputAdornment,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import { IconCheck, IconEdit, IconWorld, IconX } from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { HelpButton } from '../../../../components'
import type { BaseUrlPanelProps } from './baseUrlPanelProps.interface'


export function BaseUrlPanel({ projectId, initialValue, onChange }: BaseUrlPanelProps) {
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!editing) setValue(initialValue) }, [initialValue, editing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) { setError('The URL cannot be empty.'); return }
    try { new URL(trimmed) } catch { setError('Invalid URL. Include protocol (e.g. https://api.example.com)'); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/swagger/servers/${projectId}/base-url`, { baseUrl: trimmed })
      onChange(trimmed); setEditing(false)
    } catch { setError('Failed to save. Please try again.') } finally { setSaving(false) }
  }

  const handleCancel = () => { setValue(initialValue); setEditing(false); setError('') }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconWorld size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>API Base URL</Typography>
          <HelpButton title="API Base URL">
            <Typography variant="body2" gutterBottom>
              The root address of the external API this server connects to. Every tool call is prefixed with this URL — for example, base <code>https://api.example.com</code> + tool path <code>/users/42</code> makes a full request to <code>https://api.example.com/users/42</code>.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>When to update this field:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">Switching environments: staging → production (just change the URL, keep all tools).</Typography></Box>
              <Box component="li"><Typography variant="body2">The API migrated to a new domain or subdomain.</Typography></Box>
              <Box component="li"><Typography variant="body2">You want to test the same tools against a different server version.</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>
              The URL must include the protocol (<code>https://</code> or <code>http://</code>) and must not end with a trailing slash. Path parameters and query strings should <em>not</em> be included here — they belong in individual tool definitions.
            </Typography>
            <Typography variant="body2">
              Changes take effect immediately for all subsequent tool calls. In-flight calls are not affected.
            </Typography>
          </HelpButton>
        </Box>

        {editing ? (
          <TextField
            size="small" fullWidth autoFocus
            label="ExternalAPI Base URL" value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            error={!!error} helperText={error || 'Base URL used for all HTTP calls in this server'}
            placeholder="https://api.example.com"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Save"><span>
                    <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
                      {saving ? <CircularProgress size={14} /> : <IconCheck size={18} />}
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={handleCancel} disabled={saving}><IconX size={18} /></IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        ) : (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography
              fontFamily="monospace" fontSize="0.85rem" color="text.secondary"
              sx={{ wordBreak: 'break-all', flexGrow: 1 }}
            >
              {initialValue || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No base URL set</span>}
            </Typography>
            {can(Permission.ServersEditSettings) && (
              <Tooltip title="Edit Base URL">
                <IconButton size="small" onClick={() => setEditing(true)}><IconEdit size={15} /></IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  )
}
