import { useState } from 'react'
import {
  Box, Button, CircularProgress, Divider, IconButton,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconCopy, IconEye, IconEyeOff, IconKey,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../context/AuthContext'
import api from '../../../api'
import ConfirmDialog from '../../../components/ConfirmDialog'
import HelpButton from '../../../components/HelpButton'

export function OAuthClientPanel({ projectId, initialClientId, initialClientSecret, serverBase, onChange }: {
  projectId: string
  initialClientId?: string
  initialClientSecret?: string
  serverBase: string
  onChange: (clientId: string | null, clientSecret: string | null) => void
}) {
  const { can } = useAuth()
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [clientSecret, setClientSecret] = useState(initialClientSecret ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState<'id' | 'secret' | 'auth' | 'token' | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const hasCredentials = !!initialClientId

  const authUrl = `${serverBase}/oauth/project/${projectId}/authorize`
  const tokenUrl = `${serverBase}/oauth/project/${projectId}/token`

  const copy = (text: string, key: 'id' | 'secret' | 'auth' | 'token') => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateRandom = (len = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  const handleGenerate = () => {
    setClientId(generateRandom(16))
    setClientSecret(generateRandom(32))
  }

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    setSaving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/oauth-client`, {
        oauthClientId: clientId.trim(),
        oauthClientSecret: clientSecret.trim(),
      })
      onChange(clientId.trim(), clientSecret.trim())
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/oauth-client`, {
        oauthClientId: null,
        oauthClientSecret: null,
      })
      setClientId('')
      setClientSecret('')
      onChange(null, null)
    } finally { setRemoving(false); setConfirmRemove(false) }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconKey size={18} style={{ color: hasCredentials ? '#5D87FF' : undefined, opacity: hasCredentials ? 1 : 0.38 }} />
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>OAuth Client</Typography>
          <HelpButton title="ChatGPT OAuth Client">
            <Typography variant="body2" gutterBottom>
              Allows ChatGPT (and other OAuth 2.0 clients) to connect to this server's MCP endpoint using your account credentials.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Generate a <strong>Client ID</strong> and <strong>Client Secret</strong>, then paste the Auth and Token URLs into ChatGPT's connector settings.
            </Typography>
            <Typography variant="body2">
              When a user connects via ChatGPT they will be prompted to log in with their MCP Server account.
            </Typography>
          </HelpButton>
        </Box>
        {hasCredentials && can(Permission.ServersEditSettings) && (
          <Button size="small" color="error" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        )}
      </Box>

      {hasCredentials ? (
        <>
          {/* URLs to paste into ChatGPT */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            Paste these URLs into ChatGPT
          </Typography>
          {([
            { label: 'Auth URL', value: authUrl, key: 'auth' as const },
            { label: 'Token URL', value: tokenUrl, key: 'token' as const },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {value}
                </Box>
              </Box>
              <Tooltip title={copied === key ? 'Copied!' : `Copy ${label}`}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Divider sx={{ my: 1.5 }} />

          {/* Client credentials */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            Client credentials
          </Typography>
          {([
            { label: 'Client ID', value: initialClientId!, key: 'id' as const, mono: true },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{value}</Box>
              </Box>
              <Tooltip title={copied === key ? 'Copied!' : 'Copy'}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Box display="flex" alignItems="center" gap={1} mb={1}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
            <Box flexGrow={1} minWidth={0}>
              <Typography variant="caption" color="text.secondary">Client Secret</Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {secretVisible ? initialClientSecret : '••••••••••••••••••••••••'}
              </Box>
            </Box>
            <Tooltip title={secretVisible ? 'Hide' : 'Show'}>
              <IconButton size="small" onClick={() => setSecretVisible((v) => !v)}>
                {secretVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={copied === 'secret' ? 'Copied!' : 'Copy'}>
              <IconButton size="small" color={copied === 'secret' ? 'primary' : 'default'} onClick={() => copy(initialClientSecret!, 'secret')}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.disabled" mb={2}>
            No OAuth client configured — ChatGPT cannot connect via OAuth.
          </Typography>
          {can(Permission.ServersEditSettings) && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" gap={1}>
                <TextField size="small" fullWidth label="Client ID" value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                <TextField size="small" fullWidth label="Client Secret" value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
              </Box>
              <Box display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={handleGenerate}>
                  Auto-generate
                </Button>
                <Button size="small" variant="contained" onClick={handleSave} disabled={saving || !clientId.trim() || !clientSecret.trim()}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconKey size={16} />}>
                  {saving ? 'Saving…' : 'Save credentials'}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove OAuth client?"
        message="ChatGPT and any other OAuth clients will immediately lose access."
        confirmLabel="Remove"
        confirmColor="error"
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmRemove(false)}
      />
    </Paper>
  )
}
