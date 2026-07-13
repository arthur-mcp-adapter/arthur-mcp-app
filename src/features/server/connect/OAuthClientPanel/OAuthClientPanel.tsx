import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Button, CircularProgress, Divider, IconButton,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconCopy, IconEye, IconEyeOff, IconKey,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { ConfirmDialog } from '../../../../components'
import { HelpButton } from '../../../../components'
import type { OAuthClientPanelProps } from './oauthClientPanelProps.interface'


export function OAuthClientPanel({ projectId, initialClientId, initialClientSecret, serverBase, onChange }: OAuthClientPanelProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const { can } = useAuth()
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [clientSecret, setClientSecret] = useState(initialClientSecret ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState<'id' | 'secret' | 'auth' | 'token' | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const hasCredentials = !!initialClientId

  const authUrl = `${serverBase}/oauth/server/${projectId}/authorize`
  const tokenUrl = `${serverBase}/oauth/server/${projectId}/token`

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
          <Typography variant="subtitle1" fontWeight={700}>{t('heading.oauthClient')}</Typography>
          <HelpButton title={t('heading.oauthClient')}>
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
            {t('common:action.remove')}
          </Button>
        )}
      </Box>

      {hasCredentials ? (
        <>
          {/* URLs to paste into ChatGPT */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            {t('label.pasteUrls')}
          </Typography>
          {([
            { label: t('label.authUrl'), value: authUrl, key: 'auth' as const },
            { label: t('label.tokenUrl'), value: tokenUrl, key: 'token' as const },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {value}
                </Box>
              </Box>
              <Tooltip title={copied === key ? t('tooltip.copiedBang') : t('common:action.copy')}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Divider sx={{ my: 1.5 }} />

          {/* Client credentials */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            {t('label.clientCredentials')}
          </Typography>
          {([
            { label: t('label.clientId'), value: initialClientId!, key: 'id' as const, mono: true },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{value}</Box>
              </Box>
              <Tooltip title={copied === key ? t('tooltip.copiedBang') : t('common:action.copy')}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Box display="flex" alignItems="center" gap={1} mb={1}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
            <Box flexGrow={1} minWidth={0}>
              <Typography variant="caption" color="text.secondary">{t('label.clientSecret')}</Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {secretVisible ? initialClientSecret : '••••••••••••••••••••••••'}
              </Box>
            </Box>
            <Tooltip title={secretVisible ? t('common:action.hide') : t('common:action.show')}>
              <IconButton size="small" onClick={() => setSecretVisible((v) => !v)}>
                {secretVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={copied === 'secret' ? t('tooltip.copiedBang') : t('common:action.copy')}>
              <IconButton size="small" color={copied === 'secret' ? 'primary' : 'default'} onClick={() => copy(initialClientSecret!, 'secret')}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.disabled" mb={2}>{t('label.noOAuthClient')}</Typography>
          {can(Permission.ServersEditSettings) && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" gap={1}>
                <TextField size="small" fullWidth label={t('label.clientId')} value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                <TextField size="small" fullWidth label={t('label.clientSecret')} value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
              </Box>
              <Box display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={handleGenerate}>
                  {t('action.autoGenerate')}
                </Button>
                <Button size="small" variant="contained" onClick={handleSave} disabled={saving || !clientId.trim() || !clientSecret.trim()}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconKey size={16} />}>
                  {saving ? t('common:action.saving') : t('action.saveCredentials')}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title={t('confirm.removeOAuth')}
        message={t('confirm.removeOAuthMessage')}
        confirmLabel={t('confirm.removeLabel')}
        confirmColor="error"
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmRemove(false)}
      />
    </Paper>
  )
}
