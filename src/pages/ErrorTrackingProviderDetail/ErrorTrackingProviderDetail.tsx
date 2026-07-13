import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconBug,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconPlugConnected,
  IconSettings,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/auth'
import api from '../../api'
import { useDetailPageNav } from '../../hooks'
import { TOOL_COLORS, type ErrorTrackingProvider, type TestConnectionResult } from '../../features/errorTracking'
import Swal from 'sweetalert2'
import type { OverviewTabProps } from './overviewTabProps.interface'
import type { SettingsTabProps } from './settingsTabProps.interface'
import { SENTRY_COLOR } from './constants/sentryColor.constant'



// ─── Tab 0 — Overview ─────────────────────────────────────────────────────────

function OverviewTab({ provider }: OverviewTabProps) {
  const { t } = useTranslation('errorTracking')

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('tool.sentry')}</Typography>
          <Chip
            label="Sentry"
            size="small"
            icon={<IconBug size={12} />}
            sx={{
              height: 22, fontSize: '0.72rem', fontWeight: 600,
              bgcolor: `${SENTRY_COLOR}18`, color: SENTRY_COLOR, border: `1px solid ${SENTRY_COLOR}40`,
            }}
          />
        </Box>
        <Divider />
        {provider.projectName && (
          <>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">{t('label.projectName')}</Typography>
              <Typography variant="body2">{provider.projectName}</Typography>
            </Box>
            <Divider />
          </>
        )}
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.environment')}</Typography>
          <Typography variant="body2" fontFamily="monospace">
            {provider.environment || t('label.noEnvironment')}
          </Typography>
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.isActive')}</Typography>
          <Chip
            label={provider.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={provider.isActive ? 'success' : 'default'}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.created')}</Typography>
          <Typography variant="body2">{new Date(provider.createdAt).toLocaleString()}</Typography>
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.lastUpdated')}</Typography>
          <Typography variant="body2">{new Date(provider.updatedAt).toLocaleString()}</Typography>
        </Box>
      </Box>
    </Paper>
  )
}

// ─── Tab 1 — Settings ────────────────────────────────────────────────────────

function SettingsTab({ provider, onUpdated }: SettingsTabProps) {
  const { t } = useTranslation('errorTracking')
  const navigate = useNavigate()
  const { can } = useAuth()
  const [editName, setEditName] = useState(provider.name)
  const [editDescription, setEditDescription] = useState(provider.description ?? '')
  const [editDsn, setEditDsn] = useState('')
  const [showDsn, setShowDsn] = useState(false)
  const [editProjectName, setEditProjectName] = useState(provider.projectName ?? '')
  const [editEnvironment, setEditEnvironment] = useState(provider.environment ?? '')
  const [editIsActive, setEditIsActive] = useState(provider.isActive)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  // Test connection
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [simulating, setSimulating] = useState(false)

  // Reveal DSN
  const [revealing, setRevealing] = useState(false)

  useEffect(() => () => { if (testTimerRef.current) clearTimeout(testTimerRef.current) }, [])

  const scheduleTestResultDismiss = () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current)
    testTimerRef.current = setTimeout(() => setTestResult(null), 8000)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { data } = await api.post<TestConnectionResult>(`/error-tracking-providers/${provider.id}/test`)
      setTestResult(data)
      scheduleTestResultDismiss()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
        : undefined
      setTestResult({ ok: false, latencyMs: 0, error: msg ?? 'Connection test failed.' })
      scheduleTestResultDismiss()
    } finally {
      setTesting(false)
    }
  }

  const handleRevealDsn = async () => {
    setRevealing(true)
    try {
      const { data } = await api.post<{ dsn: string }>(`/error-tracking-providers/${provider.id}/reveal-dsn`)
      setEditDsn(data.dsn)
      setShowDsn(true)
    } catch {
      setSnack({ msg: 'Failed to reveal DSN.', severity: 'error' })
    } finally {
      setRevealing(false)
    }
  }

  const canEdit = can(Permission.ErrorTrackingEdit)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch<ErrorTrackingProvider>(`/error-tracking-providers/${provider.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        tool: 'sentry',
        dsn: editDsn.trim() || undefined,
        projectName: editProjectName.trim() || undefined,
        environment: editEnvironment.trim() || undefined,
        isActive: editIsActive,
      })
      onUpdated(data)
      setEditDsn('')
      setSnack({ msg: t('toast.updated'), severity: 'success' })
    } catch {
      setSnack({ msg: t('error.saveFailed'), severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSimulateError = async () => {
    setSimulating(true)
    try {
      await api.post(`/error-tracking-providers/${provider.id}/simulate-error`)
      setSnack({ msg: t('toast.simulateErrorSuccess'), severity: 'success' })
    } catch {
      setSnack({ msg: t('toast.simulateErrorFailed'), severity: 'error' })
    } finally {
      setSimulating(false)
    }
  }

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('confirm.deleteTitle', { name: provider.name }),
      text: t('hint.deleteWarning'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common:action.delete'),
      confirmButtonColor: '#d32f2f',
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/error-tracking-providers/${provider.id}`)
      navigate('/error-tracking')
    } catch {
      setSnack({ msg: t('error.deleteFailed'), severity: 'error' })
    }
  }

  return (
    <>
      {testResult && (
        <Alert
          severity={testResult.ok ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.ok ? `Connected · ${testResult.latencyMs}ms` : (testResult.error ?? 'Connection test failed.')}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small"
              label={t('label.name')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" multiline minRows={3}
              label={t('label.description')}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small"
              label={t('label.dsn')}
              type={showDsn ? 'text' : 'password'}
              value={editDsn}
              onChange={(e) => setEditDsn(e.target.value)}
              placeholder="Leave empty to keep existing credential"
              helperText={t('hint.dsnProtected')}
              disabled={!canEdit}
              InputProps={{
                endAdornment: canEdit ? (
                  <InputAdornment position="end">
                    {editDsn ? (
                      <Tooltip title={showDsn ? t('common:action.hide') : t('common:action.show')}>
                        <IconButton size="small" onClick={() => setShowDsn((v) => !v)} edge="end">
                          {showDsn ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reveal saved DSN">
                        <IconButton size="small" onClick={handleRevealDsn} edge="end" disabled={revealing}>
                          {revealing ? <CircularProgress size={14} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              label={t('label.projectName')}
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              placeholder={t('placeholder.projectName')}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              label={t('label.environment')}
              value={editEnvironment}
              onChange={(e) => setEditEnvironment(e.target.value)}
              placeholder={t('placeholder.environment')}
              helperText={t('hint.environmentOptional')}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  disabled={!canEdit}
                  size="small"
                />
              }
              label={<Typography variant="body2">{t('label.isActive')}</Typography>}
            />
          </Grid>
        </Grid>
        {canEdit && (
          <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
            <Button
              size="small" variant="outlined" color="inherit"
              onClick={handleTestConnection} disabled={testing || saving}
              startIcon={testing ? <CircularProgress size={14} color="inherit" /> : <IconPlugConnected size={16} />}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button
              size="small" variant="contained"
              onClick={handleSave} disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {t('action.saveChanges')}
            </Button>
          </Box>
        )}
      </Paper>

      {canEdit && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} fontSize="0.875rem" mb={0.5}>{t('action.simulateError')}</Typography>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Typography variant="body2" color="text.secondary">{t('hint.simulateError')}</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleSimulateError}
              disabled={simulating}
              startIcon={simulating ? <CircularProgress size={14} color="inherit" /> : <IconBug size={16} />}
              sx={{ flexShrink: 0 }}
            >
              {simulating ? t('action.simulatingError') : t('action.simulateError')}
            </Button>
          </Box>
        </Paper>
      )}

      {can(Permission.ErrorTrackingDelete) && (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
          <Typography fontWeight={600} fontSize="0.875rem" color="error.main" mb={1}>
            {t('label.dangerZone')}
          </Typography>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2">{t('action.deleteProvider')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('hint.deleteWarning')}</Typography>
            </Box>
            <Button size="small" color="error" variant="outlined" onClick={handleDelete}>
              {t('action.deleteProvider')}
            </Button>
          </Box>
        </Paper>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ErrorTrackingProviderDetail() {
  const { t } = useTranslation('errorTracking')
  const { id } = useParams<{ id: string }>()
  const [provider, setProvider] = useState<ErrorTrackingProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!id) return
    api.get<ErrorTrackingProvider>(`/error-tracking-providers/${id}`)
      .then((r) => setProvider(r.data))
      .finally(() => setLoading(false))
  }, [id])

  useDetailPageNav(() => {
    if (!provider) return null
    return {
      name: provider.name,
      sourceEmoji: '🐛',
      sourceColor: SENTRY_COLOR,
      backLabel: t('nav.backLabel'),
      backPath: '/error-tracking',
      navItems: [
        { label: t('tab.overview'), icon: <IconInfoCircle size={17} />, idx: 0 },
        { label: t('tab.settings'), icon: <IconSettings size={17} />, idx: 1 },
      ],
      tab,
      onTabChange: (next: number) => setTab(next),
    }
  }, [provider, tab, t])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    )
  }

  if (!provider) {
    return (
      <Box py={8} textAlign="center">
        <Typography color="text.secondary">{t('empty.notFound')}</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          display="flex" alignItems="center" gap={0.75}
          px={2} py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Chip
            label="Sentry"
            size="small"
            icon={<IconBug size={12} />}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 600,
              bgcolor: `${SENTRY_COLOR}18`, color: SENTRY_COLOR, border: `1px solid ${SENTRY_COLOR}40`,
            }}
          />
          {provider.environment && (
            <Chip
              label={provider.environment}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem', fontFamily: 'monospace' }}
            />
          )}
          {provider.projectName && (
            <Typography variant="caption" color="text.secondary">
              {provider.projectName}
            </Typography>
          )}
          <Box flexGrow={1} />
          <Typography variant="caption" color="text.secondary">
            {t('label.updated', { date: new Date(provider.updatedAt).toLocaleDateString() })}
          </Typography>
        </Box>
        <Box px={2} py={1.5}>
          <Typography fontWeight={700} fontSize="1.1rem">{provider.name}</Typography>
          <Typography fontSize="0.82rem" color="text.secondary" mt={0.25}>
            {provider.description || t('label.noDescription')}
          </Typography>
        </Box>
      </Paper>

      {tab === 0 && <OverviewTab provider={provider} />}
      {tab === 1 && <SettingsTab provider={provider} onUpdated={setProvider} />}
    </Box>
  )
}
