import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconMail,
  IconWorld,
  IconShieldLock,
  IconAdjustments,
  IconHttpConnect,
  IconActivity,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { useDetailPageNav } from '../../hooks'
import { HelpButton } from '../../components'
import { ObservabilityEnvironmentPanel } from '../../features/observability'
import type { SettingsSnapshot } from './settingsSnapshot.interface'
import type { SettingsTab } from './settingsTab.type'

export default function Settings() {
  const { can, selfHosted, loading: authLoading } = useAuth()
  const { t } = useTranslation('settings')
  const [data, setData] = useState<SettingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('server')

  useEffect(() => {
    api.get<SettingsSnapshot>('/settings')
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

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

  if (error || !data) return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
      <Typography variant="h6" color="text.secondary">{t('loadError')}</Typography>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('title')}</Typography>
        <HelpButton title={t('help.title')}>
          <Typography variant="body2" gutterBottom>{t('help.intro')}</Typography>
        </HelpButton>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        {selfHosted ? t('help.envDrivenSelfHosted') : t('help.envDrivenHosted')}
      </Alert>

      {tab === 'server' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><IconWorld size={18} /></Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('server.title')}</Typography>
          </Box>
          <TextField
            size="small" fullWidth disabled
            label={t('server.urlLabel')}
            value={data.appUrl}
            InputProps={{ startAdornment: <InputAdornment position="start"><IconWorld size={16} /></InputAdornment> }}
          />
        </Paper>
      )}

      {tab === 'security' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><IconShieldLock size={18} /></Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('security.title')}</Typography>
          </Box>
          <Typography variant="body2" color={data.jwtSecretConfigured ? 'success.main' : 'warning.main'}>
            {data.jwtSecretConfigured ? t('security.jwtSecretConfigured') : t('security.jwtSecretDefault')}
          </Typography>
        </Paper>
      )}

      {tab === 'headers' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><IconHttpConnect size={18} /></Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('headers.title')}</Typography>
          </Box>
          {data.globalRequestHeaders.length === 0 ? (
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">{t('headers.empty')}</Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {data.globalRequestHeaders.map((header, i) => (
                <Box key={i} display="flex" alignItems="center" gap={1}>
                  <TextField size="small" disabled value={header.name} sx={{ width: 220, flexShrink: 0, fontFamily: 'monospace' }} />
                  <TextField size="small" disabled fullWidth value={header.value} sx={{ fontFamily: 'monospace' }} />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {tab === 'email' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><IconMail size={18} /></Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('smtp.title')}</Typography>
          </Box>
          {!data.smtp.configured && (
            <Typography variant="body2" color="warning.main" mb={2}>{t('smtp.notConfigured')}</Typography>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField size="small" fullWidth disabled label={t('smtp.hostLabel')} value={data.smtp.host ?? ''} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth disabled label={t('smtp.portLabel')} value={data.smtp.port ?? ''} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth disabled label={t('smtp.userLabel')} value={data.smtp.user ?? ''} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth disabled label={t('smtp.fromLabel')} value={data.smtp.from ?? ''} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {tab === 'observability' && (
        <ObservabilityEnvironmentPanel />
      )}
    </Box>
  )
}
