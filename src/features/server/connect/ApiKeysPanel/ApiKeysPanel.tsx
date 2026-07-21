import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer,
  IconButton, Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconCopy, IconEye, IconEyeOff, IconLock, IconLockOpen,
  IconPlus, IconTrash, IconX,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { ConfirmDialog } from '../../../../components'
import { HelpButton } from '../../../../components'
import type { McpApiKeyEntry } from '../../types'
import type { ApiKeysPanelProps } from './apiKeysPanelProps.interface'
import './index.css'


export function ApiKeysPanel({ projectId, initialKeys, onChange }: ApiKeysPanelProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const [keys, setKeys] = useState<McpApiKeyEntry[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const { can } = useAuth()
  // After creation, the newly created key id is tracked to highlight it
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  // Revoke confirm dialog
  const [revokeTarget, setRevokeTarget] = useState<McpApiKeyEntry | null>(null)
  const [revoking, setRevoking] = useState(false)

  const syncKeys = (updated: McpApiKeyEntry[]) => { setKeys(updated); onChange(updated) }

  const handleAdd = async () => {
    if (!newKeyName.trim()) { setAddError(t('error.keyNameRequired')); return }
    setAdding(true)
    setAddError('')
    try {
      const { data } = await api.post<McpApiKeyEntry>(`/swagger/servers/${projectId}/api-keys`, { name: newKeyName.trim() })
      const updated = [...keys, data]
      syncKeys(updated)
      setNewlyCreatedId(data.id)
      setVisibleIds((s) => new Set([...s, data.id]))
      setAddOpen(false)
      setNewKeyName('')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('error.errorCreatingKey')
        : t('error.errorCreatingKey')
      setAddError(msg)
    } finally { setAdding(false) }
  }

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/api-keys/${revokeTarget.id}`)
      const updated = keys.filter((k) => k.id !== revokeTarget.id)
      syncKeys(updated)
      if (newlyCreatedId === revokeTarget.id) setNewlyCreatedId(null)
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  const handleCopy = (entry: McpApiKeyEntry) => {
    navigator.clipboard.writeText(entry.key)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleVisible = (id: string) => {
    setVisibleIds((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const maskKey = (key: string) => `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-6)}`

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={keys.length > 0 ? 2 : 0}>
        {keys.length > 0
          ? <IconLock size={18} className="api-keys-panel-status-icon-locked" />
          : <IconLockOpen size={18} className="api-keys-panel-status-icon-unlocked" />}
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>{t('heading.accessKeys')}</Typography>
          <HelpButton title={t('heading.accessKeys')} docsRefs={[
            { en: 'How-to-Generate-an-Access-Key', ptBR: 'Como-Gerar-uma-Access-Key' },
            { en: 'What-Are-Access-Keys-For', ptBR: 'Para-que-Servem-as-Access-Keys' },
            { en: 'How-Access-Keys-Work', ptBR: 'Como-Funcionam-as-Access-Keys' },
          ]}>
            <Typography variant="body2" gutterBottom>{t('help.accessKeys.intro')}</Typography>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('help.accessKeys.stepsTitle')}</Typography>
            <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('help.accessKeys.create')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.accessKeys.copy')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.accessKeys.connect')}</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>{t('help.accessKeys.result')}</Typography>
            <Typography variant="body2" gutterBottom>{t('help.accessKeys.manage')}</Typography>
            <Typography variant="body2" color="warning.main">{t('help.accessKeys.caution')}</Typography>
          </HelpButton>
        </Box>
        {can(Permission.ApiKeysCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={18} />}
            onClick={() => { setAddOpen(true); setNewKeyName(''); setAddError('') }}>
            {t('action.addKey')}
          </Button>
        )}
      </Box>

      {keys.length === 0 ? (
          <Typography variant="body2" color="text.disabled">{t('label.noKeys')}</Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {keys.map((entry) => {
            const isNew = entry.id === newlyCreatedId
            const isVisible = visibleIds.has(entry.id)
            return (
              <Box key={entry.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                border: '1px solid', borderColor: isNew ? 'success.light' : 'divider',
                borderRadius: 1, px: 1.5, py: 1,
                bgcolor: isNew ? 'rgba(73,204,144,0.08)' : 'transparent',
                transition: 'background-color 0.3s',
              }}>
                <Box flexGrow={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                    <Typography fontWeight={600} fontSize="0.875rem">{entry.name}</Typography>
                    {isNew && <Chip label={t('label.newCopyNow')} size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />}
                  </Box>
                  <Box sx={{
                    fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {isVisible ? entry.key : maskKey(entry.key)}
                  </Box>
                  <Typography variant="caption" color="text.disabled">{t('label.createdAt', { date: new Date(entry.createdAt).toLocaleDateString() })}</Typography>
                </Box>
                <Tooltip title={isVisible ? t('common:action.hideKey') : t('common:action.showKey')}>
                  <IconButton size="small" onClick={() => toggleVisible(entry.id)}>
                    {isVisible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copiedId === entry.id ? t('tooltip.copiedBang') : t('common:action.copy')}>
                  <IconButton size="small" color={copiedId === entry.id ? 'primary' : 'default'} onClick={() => handleCopy(entry)}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
                {can(Permission.ApiKeysDelete) && (
                  <Tooltip title={t('confirm.revokeKey', { name: entry.name })}>
                    <IconButton size="small" color="error" onClick={() => setRevokeTarget(entry)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          })}
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={0.75} mt={0.5}>
            <Typography variant="caption" color="text.secondary">{t('label.useInHeader')}</Typography>
            <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.75rem' }}>auth: &lt;key&gt;</Box>
            <Typography variant="caption" color="text.secondary">{t('label.useInQuery')}</Typography>
            <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.75rem' }}>?auth=&lt;key&gt;</Box>
          </Box>
          <Typography variant="caption" color="warning.main">
            {t('hint.queryAccessKeyWarning')}
          </Typography>
        </Box>
      )}

      {/* Add key dialog */}
      <Drawer anchor="right" open={addOpen} onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>{t('action.createKey')}</Typography>
          <IconButton size="small" onClick={() => setAddOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <TextField size="small" fullWidth autoFocus label={t('common:label.name')}
            placeholder={t('placeholder.serverName')}
            value={newKeyName}
            onChange={(e) => { setNewKeyName(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
            helperText={t('hint.keyLabel')}
          />
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setAddOpen(false)}>{t('common:action.cancel')}</Button>
          <Button variant="contained" onClick={handleAdd} disabled={adding}
            startIcon={adding ? <CircularProgress size={14} color="inherit" /> : <IconLock size={18} />}>
            {adding ? t('common:action.creating') : t('action.createKey')}
          </Button>
        </Box>
      </Drawer>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={revokeTarget !== null}
        title={t('confirm.revokeKey', { name: revokeTarget?.name ?? '' })}
        message={t('confirm.revokeKeyMessage')}
        confirmLabel={t('confirm.revokeLabel')}
        confirmColor="error"
        loading={revoking}
        onConfirm={handleRevokeConfirm}
        onClose={() => setRevokeTarget(null)}
      />
    </Paper>
  )
}
