import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer,
  IconButton, Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconCopy, IconEye, IconEyeOff, IconLock, IconLockOpen,
  IconPlus, IconTrash, IconX,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../context/AuthContext'
import api from '../../../api'
import ConfirmDialog from '../../../components/ConfirmDialog'
import HelpButton from '../../../components/HelpButton'
import type { McpApiKeyEntry } from '../types'

export function ApiKeysPanel({ projectId, initialKeys, onChange }: {
  projectId: string
  initialKeys: McpApiKeyEntry[]
  onChange: (keys: McpApiKeyEntry[]) => void
}) {
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
    if (!newKeyName.trim()) { setAddError('Name is required.'); return }
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
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error creating key.'
        : 'Error creating key.'
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
          ? <IconLock size={18} style={{ color: '#13DEB9' }} />
          : <IconLockOpen size={18} style={{ opacity: 0.38 }} />}
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>Access Keys</Typography>
          <HelpButton title="Access Keys">
            <Typography variant="body2" gutterBottom>
              Named keys that control who can connect to this server's AI endpoint.
              Every client must include <code>auth: &lt;key&gt;</code> in their configuration — requests without a valid key are rejected.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Create <strong>one key per client</strong> (e.g. "Claude Desktop", "Cursor") so you can revoke access for a single client without affecting others.
            </Typography>
            <Typography variant="body2">
              Without any key, the endpoint is <strong>publicly accessible</strong> to anyone who knows the URL.
            </Typography>
          </HelpButton>
        </Box>
        {can(Permission.ApiKeysCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={18} />}
            onClick={() => { setAddOpen(true); setNewKeyName(''); setAddError('') }}>
            Add key
          </Button>
        )}
      </Box>

      {keys.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          No keys — any MCP client can connect without authentication.
        </Typography>
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
                    {isNew && <Chip label="new — copy now" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />}
                  </Box>
                  <Box sx={{
                    fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {isVisible ? entry.key : maskKey(entry.key)}
                  </Box>
                  <Typography variant="caption" color="text.disabled">
                    Created {new Date(entry.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Tooltip title={isVisible ? 'Hide key' : 'Show key'}>
                  <IconButton size="small" onClick={() => toggleVisible(entry.id)}>
                    {isVisible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copiedId === entry.id ? 'Copied!' : 'Copy key'}>
                  <IconButton size="small" color={copiedId === entry.id ? 'primary' : 'default'} onClick={() => handleCopy(entry)}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
                {can(Permission.ApiKeysDelete) && (
                  <Tooltip title="Revoke key">
                    <IconButton size="small" color="error" onClick={() => setRevokeTarget(entry)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          })}
          <Typography variant="caption" color="text.secondary" mt={0.5}>
            Use in the header: <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.75rem' }}>auth: &lt;key&gt;</Box>
          </Typography>
        </Box>
      )}

      {/* Add key dialog */}
      <Drawer anchor="right" open={addOpen} onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Add API key</Typography>
          <IconButton size="small" onClick={() => setAddOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <TextField size="small" fullWidth autoFocus label="Key name"
            placeholder="e.g. Claude Desktop, Production client"
            value={newKeyName}
            onChange={(e) => { setNewKeyName(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
            helperText="A label to identify which client uses this key"
          />
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={adding}
            startIcon={adding ? <CircularProgress size={14} color="inherit" /> : <IconLock size={18} />}>
            {adding ? 'Creating…' : 'Create key'}
          </Button>
        </Box>
      </Drawer>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={revokeTarget !== null}
        title={`Revoke "${revokeTarget?.name}"?`}
        message="Any client using this key will immediately lose access."
        confirmLabel="Revoke"
        confirmColor="error"
        loading={revoking}
        onConfirm={handleRevokeConfirm}
        onClose={() => setRevokeTarget(null)}
      />
    </Paper>
  )
}
