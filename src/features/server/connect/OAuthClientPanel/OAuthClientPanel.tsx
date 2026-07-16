import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, CircularProgress, Divider, FormControl,
  FormControlLabel, FormLabel, IconButton, Paper, Radio, RadioGroup,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { IconCopy, IconEye, IconEyeOff, IconKey } from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { ConfirmDialog, HelpButton } from '../../../../components'
import type { OAuthConfig } from '../../types'
import type { OAuthClientPanelProps } from './oauthClientPanelProps.interface'
import './index.css'

export function OAuthClientPanel({
  projectId,
  shareSlug,
  initialClientId,
  initialClientSecret,
  initialConfig,
  serverBase,
  onChange,
}: OAuthClientPanelProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const { can } = useAuth()
  const initialMode: OAuthConfig['mode'] = initialConfig?.mode ?? (initialClientId ? 'managed' : 'none')
  const externalConfig = initialConfig?.mode === 'external' ? initialConfig : undefined
  const [mode, setMode] = useState<OAuthConfig['mode']>(initialMode)
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [clientSecret, setClientSecret] = useState(initialClientSecret ?? '')
  const [issuer, setIssuer] = useState(externalConfig?.issuer ?? '')
  const [authorizationUrl, setAuthorizationUrl] = useState(externalConfig?.authorizationUrl ?? '')
  const [tokenUrl, setTokenUrl] = useState(externalConfig?.tokenUrl ?? '')
  const [jwksUrl, setJwksUrl] = useState(externalConfig?.jwksUrl ?? '')
  const [introspectionUrl, setIntrospectionUrl] = useState(externalConfig?.introspectionUrl ?? '')
  const [introspectionClientId, setIntrospectionClientId] = useState(externalConfig?.introspectionClientId ?? '')
  const [introspectionClientSecret, setIntrospectionClientSecret] = useState(externalConfig?.introspectionClientSecret ?? '')
  const [audience, setAudience] = useState(externalConfig?.audience ?? '')
  const [scopes, setScopes] = useState(externalConfig?.scopes.join(' ') ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const canEdit = can(Permission.ServersEditSettings)
  const oauthServerId = shareSlug || projectId
  const protectedResourceUrl = `${serverBase}/.well-known/oauth-protected-resource/api/mcp/server/${oauthServerId}`
  const mcpResourceUrl = `${serverBase}/api/mcp/server/${oauthServerId}`
  const managedMetadataUrl = `${serverBase}/.well-known/oauth-authorization-server/oauth/server/${oauthServerId}`
  const managedAuthUrl = `${serverBase}/oauth/server/${oauthServerId}/authorize`
  const managedTokenUrl = `${serverBase}/oauth/server/${oauthServerId}/token`
  const hasSavedConfiguration = initialMode !== 'none'

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateRandom = (len = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

  const handleGenerate = () => {
    setClientId(generateRandom(16))
    setClientSecret(generateRandom(32))
  }

  const externalScopes = scopes.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean)
  const saveDisabled = saving
    || mode === 'none'
    || (mode === 'managed' && (!clientId.trim() || !clientSecret.trim()))
    || (mode === 'external' && (
      !issuer.trim() || !authorizationUrl.trim() || !tokenUrl.trim() || !audience.trim()
      || (!jwksUrl.trim() && !introspectionUrl.trim())
      || (!!introspectionUrl.trim() && (!introspectionClientId.trim() || !introspectionClientSecret.trim()))
    ))

  const handleSave = async () => {
    if (saveDisabled) return
    setSaving(true)
    try {
      const payload = mode === 'managed'
        ? {
            mode,
            oauthClientId: clientId.trim(),
            oauthClientSecret: clientSecret.trim(),
          }
        : {
            mode,
            oauthClientId: null,
            oauthClientSecret: null,
            issuer: issuer.trim(),
            authorizationUrl: authorizationUrl.trim(),
            tokenUrl: tokenUrl.trim(),
            jwksUrl: jwksUrl.trim() || undefined,
            introspectionUrl: introspectionUrl.trim() || undefined,
            introspectionClientId: introspectionClientId.trim() || undefined,
            introspectionClientSecret: introspectionClientSecret.trim() || undefined,
            audience: audience.trim(),
            scopes: externalScopes,
          }
      const { data } = await api.patch(`/swagger/servers/${projectId}/oauth-client`, payload)
      onChange(data.oauthClientId ?? null, data.oauthClientSecret ?? null, data.oauthConfig as OAuthConfig)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/oauth-client`, {
        mode: 'none', oauthClientId: null, oauthClientSecret: null,
      })
      setMode('none')
      setClientId('')
      setClientSecret('')
      onChange(null, null, { mode: 'none' })
    } finally {
      setRemoving(false)
      setConfirmRemove(false)
    }
  }

  const urlRows = mode === 'managed'
    ? [
        { key: 'resource', label: t('label.oauthProtectedResourceUrl'), value: protectedResourceUrl },
        { key: 'metadata', label: t('label.oauthAuthorizationMetadataUrl'), value: managedMetadataUrl },
        { key: 'auth', label: t('label.authUrl'), value: managedAuthUrl },
        { key: 'token', label: t('label.tokenUrl'), value: managedTokenUrl },
      ]
    : mode === 'external'
      ? [
          { key: 'resource', label: t('label.oauthProtectedResourceUrl'), value: protectedResourceUrl },
          { key: 'issuer', label: t('label.oauthIssuerUrl'), value: issuer },
          { key: 'auth', label: t('label.authUrl'), value: authorizationUrl },
          { key: 'token', label: t('label.tokenUrl'), value: tokenUrl },
        ].filter(({ value }) => !!value)
      : []

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconKey size={18} className={hasSavedConfiguration ? 'oauth-client-panel-status-icon oauth-client-panel-status-icon-active' : 'oauth-client-panel-status-icon'} />
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>{t('heading.oauthClient')}</Typography>
          <HelpButton title={t('heading.oauthClient')}>
            <Typography variant="body2" mb={2}>{t('hint.oauthHelpIntro')}</Typography>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('hint.oauthHelpChooseTitle')}</Typography>
            <Box component="ul" sx={{ mt: 0, mb: 2, pl: 2.5 }}>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpChooseExternal')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpChooseManaged')}</Typography>
              <Typography component="li" variant="body2">{t('hint.oauthHelpChooseDisabled')}</Typography>
            </Box>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('hint.oauthHelpExternalTitle')}</Typography>
            <Box component="ol" sx={{ mt: 0, mb: 2, pl: 2.5 }}>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpExternalStep1')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpExternalStep2')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpExternalStep3')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpExternalStep4', { resource: mcpResourceUrl })}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpExternalStep5')}</Typography>
              <Typography component="li" variant="body2">{t('hint.oauthHelpExternalStep6')}</Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>{t('hint.oauthHelpDiscovery', { url: protectedResourceUrl })}</Alert>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('hint.oauthHelpManagedTitle')}</Typography>
            <Box component="ol" sx={{ mt: 0, mb: 2, pl: 2.5 }}>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpManagedStep1')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpManagedStep2')}</Typography>
              <Typography component="li" variant="body2">{t('hint.oauthHelpManagedStep3')}</Typography>
            </Box>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('hint.oauthHelpFlowTitle')}</Typography>
            <Typography variant="body2" mb={2}>{t('hint.oauthHelpFlow')}</Typography>

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t('hint.oauthHelpTestTitle')}</Typography>
            <Box component="ol" sx={{ mt: 0, mb: 2, pl: 2.5 }}>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpTestStep1')}</Typography>
              <Typography component="li" variant="body2" mb={0.75}>{t('hint.oauthHelpTestStep2')}</Typography>
              <Typography component="li" variant="body2">{t('hint.oauthHelpTestStep3')}</Typography>
            </Box>

            <Alert severity="warning">{t('hint.oauthModelSafety')}</Alert>
          </HelpButton>
        </Box>
        {hasSavedConfiguration && canEdit && (
          <Button size="small" color="error" onClick={() => setConfirmRemove(true)}>{t('common:action.remove')}</Button>
        )}
      </Box>

      <FormControl disabled={!canEdit} sx={{ mb: 2 }}>
        <FormLabel>{t('label.oauthProviderMode')}</FormLabel>
        <RadioGroup row value={mode} onChange={(event) => setMode(event.target.value as OAuthConfig['mode'])}>
          <FormControlLabel value="external" control={<Radio size="small" />} label={t('label.oauthModeExternal')} />
          <FormControlLabel value="managed" control={<Radio size="small" />} label={t('label.oauthModeManaged')} />
          <FormControlLabel value="none" control={<Radio size="small" />} label={t('label.oauthModeNone')} />
        </RadioGroup>
      </FormControl>

      {mode === 'external' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Alert severity="info">{t('hint.oauthExternalLoginPage')}</Alert>
          <TextField size="small" fullWidth label={t('label.oauthIssuerUrl')} value={issuer}
            onChange={(event) => setIssuer(event.target.value)} disabled={!canEdit} />
          <Box display="flex" gap={1} flexWrap="wrap">
            <TextField size="small" fullWidth label={t('label.authUrl')} value={authorizationUrl}
              onChange={(event) => setAuthorizationUrl(event.target.value)} disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
            <TextField size="small" fullWidth label={t('label.tokenUrl')} value={tokenUrl}
              onChange={(event) => setTokenUrl(event.target.value)} disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <TextField size="small" fullWidth label={t('label.oauthJwksUrl')} value={jwksUrl}
              helperText={t('hint.oauthJwks')} onChange={(event) => setJwksUrl(event.target.value)}
              disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
            <TextField size="small" fullWidth label={t('label.oauthIntrospectionUrl')} value={introspectionUrl}
              helperText={t('hint.oauthIntrospection')} onChange={(event) => setIntrospectionUrl(event.target.value)}
              disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
          </Box>
          {!!introspectionUrl.trim() && (
            <Box display="flex" gap={1} flexWrap="wrap">
              <TextField size="small" fullWidth label={t('label.oauthIntrospectionClientId')} value={introspectionClientId}
                onChange={(event) => setIntrospectionClientId(event.target.value)} disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
              <TextField size="small" fullWidth type="password" label={t('label.oauthIntrospectionClientSecret')} value={introspectionClientSecret}
                onChange={(event) => setIntrospectionClientSecret(event.target.value)} disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
            </Box>
          )}
          <Box display="flex" gap={1} flexWrap="wrap">
            <TextField size="small" fullWidth label={t('label.oauthAudience')} value={audience}
              helperText={t('hint.oauthAudience')} onChange={(event) => setAudience(event.target.value)}
              disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
            <TextField size="small" fullWidth label={t('label.oauthScopes')} value={scopes}
              helperText={t('hint.oauthScopes')} onChange={(event) => setScopes(event.target.value)}
              disabled={!canEdit} sx={{ minWidth: 240, flex: 1 }} />
          </Box>
        </Box>
      )}

      {mode === 'managed' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Alert severity="warning">{t('hint.oauthManagedLoginPage')}</Alert>
          <Box display="flex" gap={1} flexWrap="wrap">
            <TextField className="oauth-client-panel-monospace-input" size="small" fullWidth label={t('label.clientId')}
              value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={!canEdit}
              sx={{ minWidth: 240, flex: 1 }} />
            <TextField className="oauth-client-panel-monospace-input" size="small" fullWidth label={t('label.clientSecret')}
              type={secretVisible ? 'text' : 'password'} value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)} disabled={!canEdit}
              sx={{ minWidth: 240, flex: 1 }}
              InputProps={{ endAdornment: (
                <IconButton size="small" onClick={() => setSecretVisible((visible) => !visible)}>
                  {secretVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </IconButton>
              ) }} />
          </Box>
          {canEdit && (
            <Button size="small" variant="outlined" onClick={handleGenerate} sx={{ alignSelf: 'flex-start' }}>
              {t('action.autoGenerate')}
            </Button>
          )}
        </Box>
      )}

      {mode === 'none' && <Typography variant="body2" color="text.secondary">{t('label.noOAuthClient')}</Typography>}

      {urlRows.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            {t('label.pasteUrls')}
          </Typography>
          {urlRows.map(({ key, label, value }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</Box>
              </Box>
              <Tooltip title={copied === key ? t('tooltip.copiedBang') : t('common:action.copy')}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </>
      )}

      {canEdit && mode !== 'none' && (
        <Button size="small" variant="contained" onClick={handleSave} disabled={saveDisabled}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconKey size={16} />} sx={{ mt: 1 }}>
          {saving ? t('common:action.saving') : t('common:action.save')}
        </Button>
      )}

      <ConfirmDialog open={confirmRemove} title={t('confirm.removeOAuth')} message={t('confirm.removeOAuthMessage')}
        confirmLabel={t('confirm.removeLabel')} confirmColor="error" loading={removing}
        onConfirm={handleRemove} onClose={() => setConfirmRemove(false)} />
    </Paper>
  )
}
