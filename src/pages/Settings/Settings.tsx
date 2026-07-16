import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconActivity,
  IconDeviceFloppy,
  IconMail,
  IconWorld,
  IconClock,
  IconShieldLock,
  IconAdjustments,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { useDetailPageNav } from '../../hooks'
import { AppSnackbar, HelpButton } from '../../components'
import { GlobalRequestHeadersPanel, type HeaderEntry } from '../../features/settings'
import { ObservabilityEnvironmentPanel } from '../../features/observability'
import { emailValid, portValid } from '../../utils/validation'
import type { SettingsData } from './settingsData.interface'
import type { SettingsTab } from './settingsTab.type'


export default function Settings() {
  const { can, loading: authLoading } = useAuth()
  const { t } = useTranslation('settings')
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('server')

  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  const showSnack = (msg: string, sev: 'success' | 'error') => {
    setSnackMsg(msg); setSnackSeverity(sev); setSnackOpen(true)
  }

  // Main form state
  const [serverBaseUrl, setServerBaseUrl] = useState('')
  const [defaultTimeoutMs, setDefaultTimeoutMs] = useState(30000)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [jwtSecret, setJwtSecret] = useState('')
  const [globalHeaders, setGlobalHeaders] = useState<HeaderEntry[]>([])

  const addGlobalHeader = () =>
    setGlobalHeaders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name: '', value: '' }])
  const removeGlobalHeader = (id: string) =>
    setGlobalHeaders((prev) => prev.filter((h) => h.id !== id))
  const setGlobalHeader = (id: string, field: 'name' | 'value', val: string) =>
    setGlobalHeaders((prev) => prev.map((h) => h.id === id ? { ...h, [field]: val } : h))

  const [orig, setOrig] = useState<Omit<SettingsData, 'smtpPassSet' | 'jwtSecretSet'> & { smtpPass: string; jwtSecret: string; globalRequestHeaders: { name: string; value: string }[] } | null>(null)

  useEffect(() => {
    api.get<SettingsData>('/settings')
      .then((r) => {
        setData(r.data)
        setServerBaseUrl(r.data.serverBaseUrl || '')
        setDefaultTimeoutMs(r.data.defaultTimeoutMs || 30000)
        setSmtpHost(r.data.smtpHost || '')
        setSmtpPort(r.data.smtpPort || 587)
        setSmtpUser(r.data.smtpUser || '')
        setSmtpFrom(r.data.smtpFrom || '')
        setGlobalHeaders((r.data.globalRequestHeaders ?? []).map((h) => ({ id: Math.random().toString(36).slice(2), ...h })))
        setOrig({
          serverBaseUrl: r.data.serverBaseUrl || '',
          defaultTimeoutMs: r.data.defaultTimeoutMs || 30000,
          smtpHost: r.data.smtpHost || '',
          smtpPort: r.data.smtpPort || 587,
          smtpUser: r.data.smtpUser || '',
          smtpFrom: r.data.smtpFrom || '',
          smtpPass: '',
          jwtSecret: '',
          globalRequestHeaders: r.data.globalRequestHeaders ?? [],
        })
      })
      .catch(() => showSnack(t('loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = orig !== null && (
    serverBaseUrl !== orig.serverBaseUrl ||
    defaultTimeoutMs !== orig.defaultTimeoutMs ||
    smtpHost !== orig.smtpHost ||
    smtpPort !== orig.smtpPort ||
    smtpUser !== orig.smtpUser ||
    smtpFrom !== orig.smtpFrom ||
    smtpPass !== '' ||
    jwtSecret !== '' ||
    JSON.stringify(globalHeaders.map((h) => ({ name: h.name, value: h.value }))) !== JSON.stringify(orig.globalRequestHeaders)
  )

  const smtpFromError = !emailValid(smtpFrom)
  const smtpPortError = !portValid(smtpPort)
  const jwtSecretError = jwtSecret !== '' && jwtSecret.trim().length < 16

  const handleSave = async () => {
    if (smtpFromError || smtpPortError || jwtSecretError) {
      showSnack(t('saveValidationError'), 'error')
      return
    }
    setSaving(true)
    try {
      const cleanHeaders = globalHeaders.filter((h) => h.name.trim()).map((h) => ({ name: h.name.trim(), value: h.value }))
      const dto: Record<string, unknown> = {
        serverBaseUrl: serverBaseUrl.trim(),
        defaultTimeoutMs: Number(defaultTimeoutMs),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
        globalRequestHeaders: cleanHeaders,
      }
      if (smtpPass) dto.smtpPass = smtpPass
      if (jwtSecret) dto.jwtSecret = jwtSecret.trim()
      await api.patch('/settings', dto)
      showSnack(t('saveSuccess'), 'success')
      setSmtpPass('')
      setJwtSecret('')
      setData((current) => current ? {
        ...current,
        smtpPassSet: current.smtpPassSet || !!smtpPass,
        jwtSecretSet: current.jwtSecretSet || !!jwtSecret,
      } : current)
      setOrig({
        serverBaseUrl: serverBaseUrl.trim(),
        defaultTimeoutMs: Number(defaultTimeoutMs),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
        smtpPass: '',
        jwtSecret: '',
        globalRequestHeaders: cleanHeaders,
      })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('saveError')
        : t('saveError')
      showSnack(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  useDetailPageNav<SettingsTab>(() => {
    if (authLoading || !can(Permission.SettingsManage)) return null
    return {
      name: t('title'),
      sourceEmoji: '⚙',
      sourceColor: '#5D87FF',
      navItems: [
        { label: t('tab.server'), icon: <IconWorld size={17} />, idx: 'server' },
        { label: t('tab.security'), icon: <IconShieldLock size={17} />, idx: 'security' },
        { label: t('tab.headers'), icon: <IconAdjustments size={17} />, idx: 'headers' },
        { label: t('tab.email'), icon: <IconMail size={17} />, idx: 'email' },
        { label: t('tab.observability'), icon: <IconActivity size={17} />, idx: 'observability' },
      ],
      tab,
      onTabChange: setTab,
    }
  }, [authLoading, can, t, tab])

  if (loading || authLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
      <CircularProgress />
    </Box>
  )

  if (!can(Permission.SettingsManage)) return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
      <Typography variant="h6" color="text.secondary">{t('accessRestricted')}</Typography>
      <Typography variant="body2" color="text.secondary">{t('accessRestrictedMsg')}</Typography>
    </Box>
  )

  const saveSettingsButton = (
    <Box display="flex" justifyContent="flex-end" mt={1} mb={3}>
      <Button
        variant="contained"
        size="small"
        onClick={handleSave}
        disabled={saving || !isDirty}
        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={18} />}
      >
        {saving ? t('saving') : t('saveSettings')}
      </Button>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('title')}</Typography>
        <HelpButton title={t('help.title')}>
          <Typography variant="body2" gutterBottom>
            {t('help.intro')}
          </Typography>
          <Typography variant="body2" gutterBottom><strong>{t('help.sections')}</strong></Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">{t('help.sectionServer')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.sectionSecurity')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.sectionHeaders')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.sectionEmail')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.sectionObservability')}</Typography></Box>
          </Box>
          <Typography variant="body2" gutterBottom><strong>{t('help.workflowTitle')}</strong></Typography>
          <Box component="ol" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">{t('help.workflowReview')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.workflowSave')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('help.workflowVerify')}</Typography></Box>
          </Box>
          <Typography variant="body2" gutterBottom><strong>{t('help.cautionTitle')}</strong></Typography>
          <Typography variant="body2">
            {t('help.cautionBody')}
          </Typography>
        </HelpButton>
      </Box>

      {/* Server */}
      {tab === 'server' && (
        <>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><IconWorld size={18} /></Box>
              <Typography variant="subtitle1" fontWeight={700}>{t('server.title')}</Typography>
              <HelpButton title={t('server.helpTitle')}>
                <Typography variant="body2" gutterBottom>{t('server.helpIntro')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('server.helpFieldEffects')}</strong></Typography>
                <Box component="ul" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
                  <Box component="li"><Typography variant="body2">{t('server.helpPasswordReset')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('server.helpMcpEndpoint')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('server.helpTimeout')}</Typography></Box>
                </Box>
                <Typography variant="body2" gutterBottom><strong>{t('server.helpSetupTitle')}</strong></Typography>
                <Box component="ol" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
                  <Box component="li"><Typography variant="body2">{t('server.helpSetupUrl')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('server.helpSetupTimeout')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('server.helpSetupSave')}</Typography></Box>
                </Box>
                <Typography variant="body2" gutterBottom><strong>{t('server.helpVerifyTitle')}</strong></Typography>
                <Typography variant="body2" gutterBottom>{t('server.helpVerify')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('server.helpCautionTitle')}</strong></Typography>
                <Typography variant="body2">{t('server.helpTimeoutTip')}</Typography>
              </HelpButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  size="small" fullWidth
                  label={t('server.urlLabel')}
                  placeholder={t('server.urlPlaceholder')}
                  helperText={t('server.urlHelper')}
                  value={serverBaseUrl}
                  onChange={(e) => setServerBaseUrl(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><IconWorld size={16} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small" fullWidth type="number"
                  label={t('server.timeoutLabel')}
                  helperText={t('server.timeoutHelper')}
                  value={defaultTimeoutMs}
                  onChange={(e) => setDefaultTimeoutMs(Number(e.target.value))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><IconClock size={16} /></InputAdornment> }}
                />
              </Grid>
            </Grid>
          </Paper>
          {saveSettingsButton}
        </>
      )}

      {/* Security */}
      {tab === 'security' && (
        <>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><IconShieldLock size={18} /></Box>
              <Typography variant="subtitle1" fontWeight={700}>{t('security.title')}</Typography>
              <HelpButton title={t('security.helpTitle')}>
                <Typography variant="body2" gutterBottom>{t('security.helpIntro')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('security.helpSetupTitle')}</strong></Typography>
                <Box component="ol" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
                  <Box component="li"><Typography variant="body2">{t('security.helpGenerate')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('security.helpEnter')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('security.helpSave')}</Typography></Box>
                </Box>
                <Typography variant="body2" gutterBottom><strong>{t('security.helpVerifyTitle')}</strong></Typography>
                <Typography variant="body2" gutterBottom>{t('security.helpVerify')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('security.helpCautionTitle')}</strong></Typography>
                <Typography variant="body2">{t('security.helpRotation')}</Typography>
              </HelpButton>
            </Box>
            {data?.jwtSecretSet && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                {t('security.jwtSecretAlreadySet')}
              </Typography>
            )}
            <TextField
              size="small"
              fullWidth
              type="password"
              label={data?.jwtSecretSet ? t('security.jwtSecretChangeLabel') : t('security.jwtSecretLabel')}
              value={jwtSecret}
              onChange={(e) => setJwtSecret(e.target.value)}
              error={jwtSecretError}
              helperText={jwtSecretError ? t('security.jwtSecretError') : t('security.jwtSecretHelper')}
            />
          </Paper>
          {saveSettingsButton}
        </>
      )}

      {tab === 'headers' && (
        <>
          <GlobalRequestHeadersPanel
            globalHeaders={globalHeaders}
            onAdd={addGlobalHeader}
            onRemove={removeGlobalHeader}
            onChange={setGlobalHeader}
          />
          {saveSettingsButton}
        </>
      )}

      {/* SMTP */}
      {tab === 'email' && (
        <>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><IconMail size={18} /></Box>
              <Typography variant="subtitle1" fontWeight={700}>{t('smtp.title')}</Typography>
              <HelpButton title={t('smtp.helpTitle')}>
                <Typography variant="body2" gutterBottom>{t('smtp.helpIntro')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('smtp.helpFieldGuide')}</strong></Typography>
                <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpHost')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpPort')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpUser')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpPassword')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpFrom')}</Typography></Box>
                </Box>
                <Typography variant="body2" gutterBottom><strong>{t('smtp.helpSetupTitle')}</strong></Typography>
                <Box component="ol" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpSetupProvider')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpSetupFields')}</Typography></Box>
                  <Box component="li"><Typography variant="body2">{t('smtp.helpSetupSave')}</Typography></Box>
                </Box>
                <Typography variant="body2" gutterBottom><strong>{t('smtp.helpVerifyTitle')}</strong></Typography>
                <Typography variant="body2" gutterBottom>{t('smtp.helpVerify')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('smtp.helpCautionTitle')}</strong></Typography>
                <Typography variant="body2">{t('smtp.helpRotation')}</Typography>
              </HelpButton>
            </Box>
            {data?.smtpPassSet && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                {t('smtp.passwordAlreadySet')}
              </Typography>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField size="small" fullWidth label={t('smtp.hostLabel')} placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small" fullWidth type="number" label={t('smtp.portLabel')}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  error={smtpPortError}
                  helperText={smtpPortError ? t('smtp.portError') : ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label={t('smtp.userLabel')} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  size="small" fullWidth type="password"
                  label={data?.smtpPassSet ? t('smtp.passwordChangeLabel') : t('smtp.passwordLabel')}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  size="small" fullWidth
                  label={t('smtp.fromLabel')}
                  placeholder={t('smtp.fromPlaceholder')}
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  error={smtpFromError}
                  helperText={smtpFromError ? t('smtp.fromError') : ''}
                />
              </Grid>
            </Grid>
          </Paper>
          {saveSettingsButton}
        </>
      )}

      {tab === 'observability' && (
        <ObservabilityEnvironmentPanel />
      )}

      <AppSnackbar
        open={snackOpen}
        message={snackMsg}
        severity={snackSeverity}
        onClose={() => setSnackOpen(false)}
      />
    </Box>
  )
}
