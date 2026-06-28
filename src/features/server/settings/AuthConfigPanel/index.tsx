import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, Chip, FormControl, Grid, IconButton,
  InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from '@mui/material'
import { IconKey, IconPlus, IconTrash } from '@tabler/icons-react'
import api from '../../../../api'
import { HelpButton } from '../../../../components'
import { SaveIndicator } from '../../../../components'
import { SecretAutocomplete, useSecrets } from '../../../secrets'
import type { AuthConfig, AuthType, SaveStatus } from '../../types'

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'None (public API)',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  basic: 'Basic Auth (username/password)',
  'oauth2-client': 'OAuth2 Client Credentials',
  custom: 'Custom headers',
}

export function AuthConfigPanel({ projectId, initialAuth, onChange }: {
  projectId: string
  initialAuth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}) {
  const [authType, setAuthType] = useState<AuthType>((initialAuth?.type as AuthType) ?? 'none')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const { secrets, loading: loadingSecrets } = useSecrets()

  // bearer
  const [token, setToken] = useState((initialAuth as any)?.token ?? '')
  // api-key
  const [keyName, setKeyName] = useState((initialAuth as any)?.name ?? '')
  const [keyValue, setKeyValue] = useState((initialAuth as any)?.value ?? '')
  const [keyIn, setKeyIn] = useState<'header' | 'query'>((initialAuth as any)?.in ?? 'header')
  // basic
  const [basicUser, setBasicUser] = useState((initialAuth as any)?.username ?? '')
  const [basicPass, setBasicPass] = useState((initialAuth as any)?.password ?? '')
  // oauth2-client
  const [oauthTokenUrl, setOauthTokenUrl] = useState((initialAuth as any)?.tokenUrl ?? '')
  const [oauthClientId, setOauthClientId] = useState((initialAuth as any)?.clientId ?? '')
  const [oauthClientSecret, setOauthClientSecret] = useState((initialAuth as any)?.clientSecret ?? '')
  const [oauthScope, setOauthScope] = useState((initialAuth as any)?.scope ?? '')
  // custom headers
  const [customHeaders, setCustomHeaders] = useState<{ name: string; value: string }[]>(
    (initialAuth as any)?.headers ?? [{ name: '', value: '' }]
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<AuthConfig | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: AuthConfig, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/auth`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleAuthTypeChange = (newType: AuthType) => {
    setAuthType(newType)
    let payload: AuthConfig
    switch (newType) {
      case 'bearer': payload = { type: 'bearer', token }; break
      case 'api-key': payload = { type: 'api-key', name: keyName, value: keyValue, in: keyIn }; break
      case 'basic': payload = { type: 'basic', username: basicUser, password: basicPass }; break
      case 'oauth2-client': payload = { type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }; break
      case 'custom': payload = { type: 'custom', headers: customHeaders.filter(h => h.name.trim()) }; break
      default: payload = { type: 'none' }
    }
    scheduleSave(payload, 0)
  }

  const secretInput = (value: string, onChg: (v: string) => void, label: string) => (
    <SecretAutocomplete
      value={value}
      onChange={onChg}
      label={label}
      secrets={secrets}
      loadingSecrets={loadingSecrets}
    />
  )

  const addCustomHeader = () => setCustomHeaders(prev => [...prev, { name: '', value: '' }])
  const removeCustomHeader = (i: number) => {
    const next = customHeaders.filter((_, idx) => idx !== i)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 0)
  }
  const updateCustomHeader = (i: number, field: 'name' | 'value', val: string) => {
    const next = customHeaders.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconKey size={18} />
          <Typography variant="subtitle2" fontWeight={700}>API Credentials</Typography>
          {authType !== 'none' && (
            <Chip label={AUTH_TYPE_LABELS[authType]} size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
          <HelpButton title="API Authentication">
            <Typography variant="body2" gutterBottom>
              The credentials Arthur automatically attaches to every <strong>outgoing HTTP request</strong> when calling the upstream API on behalf of an AI tool call. The AI never sees or handles these credentials — Arthur injects them invisibly.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Choose the mode that matches your API's requirements:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              {([
                ['None', 'Public API — no credentials are attached. Use for unauthenticated endpoints.'],
                ['Bearer Token', 'Adds the header Authorization: Bearer <token>. Most modern REST APIs and OAuth2 resource servers use this.'],
                ['API Key', 'Adds the key as a custom header (e.g. X-API-Key) or as a query parameter. Check your API\'s documentation for the exact field name.'],
                ['Basic Auth', 'Adds Authorization: Basic <base64(username:password)>. Used by some legacy APIs and services like Jira or Confluence.'],
                ['OAuth2 Client Credentials', 'Arthur fetches a Bearer token automatically using your client ID and secret, and renews it before it expires. Use for machine-to-machine integrations where no user is involved.'],
                ['Custom Headers', 'Add any arbitrary HTTP headers. Useful for APIs with non-standard authentication schemes or when you need to pass multiple headers (e.g. X-Tenant-Id + X-Auth-Token).'],
              ] as [string,string][]).map(([label, desc]) => (
                <Box component="li" key={label} sx={{ mb: 0.5 }}>
                  <Typography variant="body2"><strong>{label}:</strong> {desc}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Important security note:</strong> credentials are stored encrypted in the database. Use tokens and keys with the <em>minimum required scope</em> — if a credential is exposed, a limited-scope key reduces the blast radius.
            </Typography>
            <Typography variant="body2">
              These credentials are completely separate from the <strong>MCP Authentication key</strong> (which protects the MCP endpoint). One controls who can call Arthur; the other controls how Arthur calls your API.
            </Typography>
          </HelpButton>
        </Box>
        <SaveIndicator status={saveStatus} error={saveError} />
      </Box>

      {/* Type selector */}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Authentication type</InputLabel>
        <Select
          value={authType}
          label="Authentication type"
          onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
        >
          {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
            <MenuItem key={t} value={t}>{AUTH_TYPE_LABELS[t]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic fields */}
      {authType === 'none' && (
        <Typography variant="body2" color="text.secondary" fontSize="0.82rem">
          The API is public and does not require authentication. No header will be added.
        </Typography>
      )}

      {authType === 'bearer' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {secretInput(token, (v) => { setToken(v); scheduleSave({ type: 'bearer', token: v }) }, 'Bearer Token')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Bearer {'<token>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'api-key' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <TextField size="small" fullWidth label="Parameter name" placeholder="X-Api-Key"
                value={keyName}
                onChange={(e) => { setKeyName(e.target.value); scheduleSave({ type: 'api-key', name: e.target.value, value: keyValue, in: keyIn }) }}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              {secretInput(keyValue, (v) => { setKeyValue(v); scheduleSave({ type: 'api-key', name: keyName, value: v, in: keyIn }) }, 'Value')}
            </Grid>
          </Grid>
          <FormControl size="small" fullWidth>
            <InputLabel>Send as</InputLabel>
            <Select value={keyIn} label="Send as"
              onChange={(e) => { const v = e.target.value as 'header' | 'query'; setKeyIn(v); scheduleSave({ type: 'api-key', name: keyName, value: keyValue, in: v }, 0) }}>
              <MenuItem value="header">Header HTTP</MenuItem>
              <MenuItem value="query">Query param (?{keyName || 'key'}=…)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {keyIn === 'header'
              ? `Sent as: ${keyName || '<name>'}: <value>`
              : `Added to URL: ?${keyName || '<name>'}=<value>`}
          </Typography>
        </Box>
      )}

      {authType === 'basic' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Username"
            value={basicUser}
            onChange={(e) => { setBasicUser(e.target.value); scheduleSave({ type: 'basic', username: e.target.value, password: basicPass }) }}
          />
          {secretInput(basicPass, (v) => { setBasicPass(v); scheduleSave({ type: 'basic', username: basicUser, password: v }) }, 'Password')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Basic {'<base64(username:password)>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'oauth2-client' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Token URL (token endpoint)"
            placeholder="https://auth.example.com/oauth/token"
            value={oauthTokenUrl}
            onChange={(e) => { setOauthTokenUrl(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: e.target.value, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
          />
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Client ID"
                value={oauthClientId}
                onChange={(e) => { setOauthClientId(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: e.target.value, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {secretInput(oauthClientSecret, (v) => { setOauthClientSecret(v); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: v, scope: oauthScope || undefined }) }, 'Client Secret')}
            </Grid>
          </Grid>
          <TextField size="small" fullWidth label="Scope (optional)" placeholder="read write"
            value={oauthScope}
            onChange={(e) => { setOauthScope(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: e.target.value || undefined }) }}
          />
          <Typography variant="caption" color="text.secondary">
            Uses <strong>client_credentials</strong>. Token is fetched automatically and renewed when it expires.
          </Typography>
        </Box>
      )}

      {authType === 'custom' && (
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="caption" color="text.secondary" mb={0.5}>
            Add any HTTP header to the request (e.g. <code>X-Tenant-Id</code>, <code>X-Auth-Token</code>).
          </Typography>
          {customHeaders.map((h, i) => (
            <Box key={i} display="flex" gap={1} alignItems="flex-start">
              <TextField size="small" label="Header" placeholder="X-Custom-Header" sx={{ flex: 1 }}
                value={h.name} onChange={(e) => updateCustomHeader(i, 'name', e.target.value)} />
              <Box sx={{ flex: 2 }}>
                <SecretAutocomplete
                  value={h.value}
                  onChange={(v) => updateCustomHeader(i, 'value', v)}
                  label="Value"
                  secrets={secrets}
                  loadingSecrets={loadingSecrets}
                />
              </Box>
              <IconButton size="small" color="error" onClick={() => removeCustomHeader(i)}
                disabled={customHeaders.length === 1} sx={{ mt: 0.5 }}>
                <IconTrash size={18} />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<IconPlus size={18} />} onClick={addCustomHeader} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            Add header
          </Button>
        </Box>
      )}

      {authType !== 'none' && (
        <Alert severity="warning" sx={{ mt: 2, py: 0.5, fontSize: '0.78rem' }}>
          Credentials are stored in the database. Use tokens with minimum required scope.
        </Alert>
      )}
    </Paper>
  )
}
