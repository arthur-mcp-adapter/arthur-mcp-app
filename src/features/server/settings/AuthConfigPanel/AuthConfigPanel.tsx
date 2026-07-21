import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, Chip, FormControl, Grid, IconButton,
  InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from '@mui/material'
import { IconKey, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton } from '../../../../components'
import { SaveIndicator } from '../../../../components'
import { SecretAutocomplete, useSecrets } from '../../../secrets'
import type { AuthConfig, AuthType, SaveStatus } from '../../types'
import type { AuthConfigPanelProps } from './authConfigPanelProps.interface'


export function AuthConfigPanel({ projectId, initialAuth, onChange }: AuthConfigPanelProps) {
  const { t } = useTranslation('serverDetail')
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

  const AUTH_TYPE_LABELS: Record<AuthType, string> = {
    none: t('auth.typeNone'),
    bearer: t('auth.typeBearer'),
    'api-key': t('auth.typeApiKey'),
    basic: t('auth.typeBasic'),
    'oauth2-client': t('auth.typeOAuth'),
    custom: t('auth.typeCustom'),
  }

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
          <Typography variant="subtitle2" fontWeight={700}>{t('auth.title')}</Typography>
          {authType !== 'none' && (
            <Chip label={AUTH_TYPE_LABELS[authType]} size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
          <HelpButton title={t('auth.helpTitle')} docsRefs={[
            { en: 'How-to-Configure-API-Credentials', ptBR: 'How-to-Configure-API-Credentials' },
            { en: 'What-Is-API-Credentials-For', ptBR: 'Para-que-Serve-API-Credentials' },
            { en: 'What-Is-API-Credentials', ptBR: 'O-que-e-API-Credentials' },
          ]}>
            <Typography variant="body2" gutterBottom>{t('auth.helpIntro')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('auth.helpChoose')}</strong></Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              {(['helpNone', 'helpBearer', 'helpApiKey', 'helpBasic', 'helpOAuth', 'helpCustom'] as const).map((key) => (
                <Box component="li" key={key} sx={{ mb: 0.5 }}>
                  <Typography variant="body2">{t(`auth.${key}`)}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" gutterBottom>{t('auth.helpSteps')}</Typography>
            <Typography variant="body2" gutterBottom>{t('auth.helpResult')}</Typography>
            <Typography variant="body2" gutterBottom>{t('auth.helpSecurity')}</Typography>
            <Typography variant="body2">{t('auth.helpTroubleshoot')}</Typography>
          </HelpButton>
        </Box>
        <SaveIndicator status={saveStatus} error={saveError} />
      </Box>

      {/* Type selector */}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>{t('auth.typeLabel')}</InputLabel>
        <Select
          value={authType}
          label={t('auth.typeLabel')}
          onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
        >
          {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((type) => (
            <MenuItem key={type} value={type}>{AUTH_TYPE_LABELS[type]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic fields */}
      {authType === 'none' && (
        <Typography variant="body2" color="text.secondary" fontSize="0.82rem">
          {t('auth.noneHint')}
        </Typography>
      )}

      {authType === 'bearer' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {secretInput(token, (v) => { setToken(v); scheduleSave({ type: 'bearer', token: v }) }, t('auth.bearerTokenLabel'))}
          <Typography variant="caption" color="text.secondary">{t('auth.bearerSentAs')}</Typography>
        </Box>
      )}

      {authType === 'api-key' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <TextField size="small" fullWidth label={t('auth.apiKeyParamName')} placeholder="X-Api-Key"
                value={keyName}
                onChange={(e) => { setKeyName(e.target.value); scheduleSave({ type: 'api-key', name: e.target.value, value: keyValue, in: keyIn }) }}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              {secretInput(keyValue, (v) => { setKeyValue(v); scheduleSave({ type: 'api-key', name: keyName, value: v, in: keyIn }) }, t('auth.apiKeyValue'))}
            </Grid>
          </Grid>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('auth.apiKeySendAs')}</InputLabel>
            <Select value={keyIn} label={t('auth.apiKeySendAs')}
              onChange={(e) => { const v = e.target.value as 'header' | 'query'; setKeyIn(v); scheduleSave({ type: 'api-key', name: keyName, value: keyValue, in: v }, 0) }}>
              <MenuItem value="header">{t('auth.apiKeySendHeader')}</MenuItem>
              <MenuItem value="query">{t('auth.apiKeySendQuery')} (?{keyName || 'key'}=…)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {keyIn === 'header'
              ? `${t('auth.apiKeySentAsHeader')}: ${keyName || '<name>'}: <value>`
              : `${t('auth.apiKeySentAsQuery')}: ?${keyName || '<name>'}=<value>`}
          </Typography>
        </Box>
      )}

      {authType === 'basic' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label={t('auth.basicUsername')}
            value={basicUser}
            onChange={(e) => { setBasicUser(e.target.value); scheduleSave({ type: 'basic', username: e.target.value, password: basicPass }) }}
          />
          {secretInput(basicPass, (v) => { setBasicPass(v); scheduleSave({ type: 'basic', username: basicUser, password: v }) }, t('auth.basicPassword'))}
          <Typography variant="caption" color="text.secondary">{t('auth.basicSentAs')}</Typography>
        </Box>
      )}

      {authType === 'oauth2-client' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label={t('auth.oauthTokenUrl')}
            placeholder={t('auth.oauthTokenUrlPlaceholder')}
            value={oauthTokenUrl}
            onChange={(e) => { setOauthTokenUrl(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: e.target.value, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
          />
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label={t('auth.oauthClientId')}
                value={oauthClientId}
                onChange={(e) => { setOauthClientId(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: e.target.value, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {secretInput(oauthClientSecret, (v) => { setOauthClientSecret(v); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: v, scope: oauthScope || undefined }) }, t('auth.oauthClientSecret'))}
            </Grid>
          </Grid>
          <TextField size="small" fullWidth label={t('auth.oauthScope')} placeholder={t('auth.oauthScopePlaceholder')}
            value={oauthScope}
            onChange={(e) => { setOauthScope(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: e.target.value || undefined }) }}
          />
          <Typography variant="caption" color="text.secondary">{t('auth.oauthHint')}</Typography>
        </Box>
      )}

      {authType === 'custom' && (
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="caption" color="text.secondary" mb={0.5}>{t('auth.customHint')}</Typography>
          {customHeaders.map((h, i) => (
            <Box key={i} display="flex" gap={1} alignItems="flex-start">
              <TextField size="small" label={t('auth.customHeaderLabel')} placeholder={t('auth.customHeaderPlaceholder')} sx={{ flex: 1 }}
                value={h.name} onChange={(e) => updateCustomHeader(i, 'name', e.target.value)} />
              <Box sx={{ flex: 2 }}>
                <SecretAutocomplete
                  value={h.value}
                  onChange={(v) => updateCustomHeader(i, 'value', v)}
                  label={t('auth.customValueLabel')}
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
            {t('auth.addHeader')}
          </Button>
        </Box>
      )}

      {authType !== 'none' && (
        <Alert severity="warning" sx={{ mt: 2, py: 0.5, fontSize: '0.78rem' }}>
          {t('auth.storedWarning')}
        </Alert>
      )}
    </Paper>
  )
}
