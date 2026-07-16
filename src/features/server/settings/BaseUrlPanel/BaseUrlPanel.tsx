import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    if (!trimmed) { setError(t('baseUrl.errorRequired')); return }
    try { new URL(trimmed) } catch { setError(t('baseUrl.errorInvalid')); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/swagger/servers/${projectId}/base-url`, { baseUrl: trimmed })
      onChange(trimmed); setEditing(false)
    } catch { setError(t('baseUrl.errorSave')) } finally { setSaving(false) }
  }

  const handleCancel = () => { setValue(initialValue); setEditing(false); setError('') }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconWorld size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>{t('baseUrl.title')}</Typography>
          <HelpButton title={t('baseUrl.title')}>
            <Typography variant="body2" gutterBottom>{t('help.baseUrl.intro')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('help.baseUrl.whenTitle')}</strong></Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('help.baseUrl.environment')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.baseUrl.domain')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.baseUrl.version')}</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>{t('help.baseUrl.steps')}</Typography>
            <Typography variant="body2" gutterBottom>{t('help.baseUrl.result')}</Typography>
            <Typography variant="body2">{t('help.baseUrl.troubleshoot')}</Typography>
          </HelpButton>
        </Box>

        {editing ? (
          <TextField
            size="small" fullWidth autoFocus
            label={t('baseUrl.fieldLabel')} value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            error={!!error} helperText={error || t('baseUrl.helperText')}
            placeholder="https://api.example.com"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={t('common:action.save')}><span>
                    <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
                      {saving ? <CircularProgress size={14} /> : <IconCheck size={18} />}
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title={t('common:action.cancel')}>
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
              {initialValue || <span className="base-url-panel-empty">{t('baseUrl.empty')}</span>}
            </Typography>
            {can(Permission.ServersEditSettings) && (
              <Tooltip title={t('baseUrl.edit')}>
                <IconButton size="small" onClick={() => setEditing(true)}><IconEdit size={15} /></IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  )
}
