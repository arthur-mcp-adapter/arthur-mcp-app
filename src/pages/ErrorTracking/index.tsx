import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconBug,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconFlask,
  IconPlugConnected,
  IconTrash,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import api from '../../api'
import { HelpButton } from '../../components'
import { useAuth, Permission } from '../../context/AuthContext'
import type { ErrorTrackingProvider, TestConnectionResult } from '../../features/errorTracking'

const SENTRY_COLOR = '#362d59'

interface SentryForm {
  dsn: string
  environment: string
  projectName: string
  isActive: boolean
}

interface LastTestResult {
  ok: boolean
  latencyMs: number
  error?: string
  testedAt: Date
}

const EMPTY_FORM: SentryForm = { dsn: '', environment: '', projectName: '', isActive: true }

function formatTestedAt(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString()
}

export default function ErrorTracking() {
  const { t } = useTranslation('errorTracking')
  const { can } = useAuth()

  const [provider, setProvider] = useState<ErrorTrackingProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<SentryForm>(EMPTY_FORM)
  const [showDsn, setShowDsn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [lastTestResult, setLastTestResult] = useState<LastTestResult | null>(null)
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [revealing, setRevealing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  const [simulateMessage, setSimulateMessage] = useState('')
  const [simulateLevel, setSimulateLevel] = useState('error')
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    api.get<ErrorTrackingProvider[]>('/error-tracking-providers')
      .then((r) => {
        const first = r.data[0] ?? null
        setProvider(first)
        if (first) {
          setForm({ dsn: '', environment: first.environment ?? '', projectName: first.projectName ?? '', isActive: first.isActive })
        }
      })
      .catch(() => setSnack({ msg: t('error.loadFailed'), severity: 'error' }))
      .finally(() => setLoading(false))
    return () => { if (testTimerRef.current) clearTimeout(testTimerRef.current) }
  }, [t])

  const scheduleTestDismiss = () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current)
    testTimerRef.current = setTimeout(() => setTestResult(null), 8000)
  }

  const handleSave = async () => {
    if (!form.dsn.trim() && !provider) { setSaveError(t('error.dsnRequired')); return }
    setSaving(true)
    setSaveError('')
    try {
      const payload: Record<string, unknown> = {
        tool: 'sentry',
        environment: form.environment.trim() || undefined,
        projectName: form.projectName.trim() || undefined,
        isActive: form.isActive,
      }
      if (form.dsn.trim()) payload.dsn = form.dsn.trim()

      let saved: ErrorTrackingProvider
      if (provider) {
        const { data } = await api.patch<ErrorTrackingProvider>(`/error-tracking-providers/${provider.id}`, payload)
        saved = data
      } else {
        payload.name = 'Sentry'
        const { data } = await api.post<ErrorTrackingProvider>('/error-tracking-providers', payload)
        saved = data
      }
      setProvider(saved)
      setForm((f) => ({ ...f, dsn: '' }))
      setShowDsn(false)
      setSnack({ msg: provider ? t('toast.updated') : t('toast.saved'), severity: 'success' })
    } catch {
      setSaveError(t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!provider) return
    setTesting(true)
    setTestResult(null)
    try {
      const { data } = await api.post<TestConnectionResult>(`/error-tracking-providers/${provider.id}/test`)
      setTestResult(data)
      setLastTestResult({ ok: data.ok, latencyMs: data.latencyMs, error: data.error, testedAt: new Date() })
      scheduleTestDismiss()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
        : undefined
      const result = { ok: false, latencyMs: 0, error: msg ?? 'Connection test failed.' }
      setTestResult(result)
      setLastTestResult({ ...result, testedAt: new Date() })
      scheduleTestDismiss()
    } finally {
      setTesting(false)
    }
  }

  const handleRevealDsn = async () => {
    if (!provider) return
    setRevealing(true)
    try {
      const { data } = await api.post<{ dsn: string }>(`/error-tracking-providers/${provider.id}/reveal-dsn`)
      setForm((f) => ({ ...f, dsn: data.dsn }))
      setShowDsn(true)
    } catch {
      setSnack({ msg: 'Failed to reveal DSN.', severity: 'error' })
    } finally {
      setRevealing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!provider) return
    const result = await Swal.fire({
      title: 'Disconnect Sentry?',
      text: 'This will remove the DSN and stop forwarding errors. You can reconnect at any time.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Disconnect',
      confirmButtonColor: '#d32f2f',
    })
    if (!result.isConfirmed) return
    setDisconnecting(true)
    try {
      await api.delete(`/error-tracking-providers/${provider.id}`)
      setProvider(null)
      setForm(EMPTY_FORM)
      setShowDsn(false)
      setTestResult(null)
      setLastTestResult(null)
    } catch {
      setSnack({ msg: t('error.deleteFailed'), severity: 'error' })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSimulateError = async () => {
    if (!provider) return
    setSimulating(true)
    try {
      const { data } = await api.post<{ ok: boolean; eventId?: string; error?: string }>(
        `/error-tracking-providers/${provider.id}/simulate-error`,
        { message: simulateMessage.trim() || undefined, level: simulateLevel },
      )
      if (data.ok) {
        setSnack({ msg: t('toast.simulateErrorSuccess'), severity: 'success' })
      } else {
        setSnack({ msg: data.error ?? t('toast.simulateErrorFailed'), severity: 'error' })
      }
    } catch {
      setSnack({ msg: t('toast.simulateErrorFailed'), severity: 'error' })
    } finally {
      setSimulating(false)
    }
  }

  const canEdit = can(Permission.ErrorTrackingEdit)
  const isConnected = provider !== null
  const isDirty = form.dsn.trim() !== ''
    || form.environment !== (provider?.environment ?? '')
    || form.projectName !== (provider?.projectName ?? '')
    || form.isActive !== (provider?.isActive ?? true)

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="40vh"><CircularProgress /></Box>
  }

  return (
    <Box>
      {/* Page header */}
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Box sx={{ color: SENTRY_COLOR, display: 'flex' }}><IconBug size={20} /></Box>
        <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('heading.title')}</Typography>
        <HelpButton title="Sentry Error Tracking">
          <Typography variant="body2" gutterBottom>
            Sentry captures unhandled exceptions and tool execution errors from this platform, groups them by stack trace, and sends alerts when error rates spike.
          </Typography>
          <Typography variant="body2" gutterBottom>
            Find your DSN in Sentry under <strong>Settings → Projects → [your project] → Client Keys (DSN)</strong>.
          </Typography>
          <Typography variant="body2">
            The DSN is stored encrypted and never returned in API responses. Use the <strong>Reveal</strong> button to load it for editing.
          </Typography>
        </HelpButton>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>{t('heading.subtitle')}</Typography>

      {/* Connection section */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2.5}>
          <Box sx={{ color: SENTRY_COLOR, display: 'flex' }}><IconBug size={18} /></Box>
          <Typography variant="subtitle1" fontWeight={700}>Sentry</Typography>
          <Box flexGrow={1} />
          <Chip
            label={isConnected ? 'Connected' : 'Not configured'}
            size="small"
            color={isConnected ? 'success' : 'default'}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        </Box>

        {/* First-time setup guidance */}
        {!isConnected && (
          <Alert
            severity="info"
            sx={{ mb: 2.5 }}
            action={
              <Link
                href="https://sentry.io/settings/"
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                variant="body2"
                sx={{ color: 'inherit', whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                Open Sentry →
              </Link>
            }
          >
            Find your DSN in Sentry under <strong>Settings → Projects → [your project] → Client Keys</strong>.
          </Alert>
        )}

        {/* Last test result — persistent */}
        {lastTestResult && (
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: 1.5, mb: 2.5, borderRadius: 1,
              border: '1px solid', borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Chip
              label={lastTestResult.ok ? 'OK' : 'Failed'}
              size="small"
              color={lastTestResult.ok ? 'success' : 'error'}
              sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }}
            />
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
              Last tested {formatTestedAt(lastTestResult.testedAt)}
              {lastTestResult.ok && lastTestResult.latencyMs > 0 && ` · ${lastTestResult.latencyMs}ms`}
            </Typography>
            {!lastTestResult.ok && lastTestResult.error && (
              <Typography variant="body2" color="error.main" fontSize="0.78rem" sx={{ ml: 0.5 }}>
                — {lastTestResult.error}
              </Typography>
            )}
          </Box>
        )}

        {/* Ephemeral test result alert */}
        {testResult && (
          <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setTestResult(null)}>
            {testResult.ok ? `Connected · ${testResult.latencyMs}ms` : (testResult.error ?? 'Connection test failed.')}
          </Alert>
        )}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>{saveError}</Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              size="small" fullWidth
              label={t('label.dsn')}
              placeholder={isConnected ? 'Leave empty to keep saved DSN' : t('placeholder.dsn')}
              value={form.dsn}
              type={showDsn ? 'text' : 'password'}
              disabled={!canEdit}
              helperText={isConnected ? t('hint.dsnProtected') : t('hint.dsnRequired')}
              onChange={(e) => { setForm((f) => ({ ...f, dsn: e.target.value })); setSaveError('') }}
              InputProps={{
                endAdornment: canEdit ? (
                  <InputAdornment position="end">
                    {form.dsn ? (
                      <Tooltip title={showDsn ? 'Hide' : 'Show'}>
                        <IconButton size="small" onClick={() => setShowDsn((v) => !v)} edge="end">
                          {showDsn ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    ) : isConnected ? (
                      <Tooltip title="Reveal saved DSN">
                        <IconButton size="small" onClick={handleRevealDsn} edge="end" disabled={revealing}>
                          {revealing ? <CircularProgress size={14} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              size="small" fullWidth
              label={t('label.environment')}
              placeholder={t('placeholder.environment')}
              value={form.environment}
              disabled={!canEdit}
              helperText={t('hint.environmentOptional')}
              onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              size="small" fullWidth
              label={t('label.projectName')}
              placeholder={t('placeholder.projectName')}
              value={form.projectName}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  size="small" checked={form.isActive} disabled={!canEdit} color="success"
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label={
                <Typography variant="body2">
                  {form.isActive
                    ? 'Active — forwarding error events to Sentry'
                    : 'Inactive — error forwarding paused'}
                </Typography>
              }
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Action row — outside Paper, same as Settings page */}
      {canEdit && (
        <Box display="flex" justifyContent="flex-end" gap={1} mt={1} mb={3}>
          {isConnected && (
            <Button
              variant="outlined" size="small" color="inherit"
              startIcon={testing ? <CircularProgress size={14} color="inherit" /> : <IconPlugConnected size={16} />}
              onClick={handleTestConnection}
              disabled={testing || saving}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          )}
          <Button
            variant="contained" size="small"
            onClick={handleSave}
            disabled={saving || (!isDirty && isConnected)}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={18} />}
          >
            {saving ? 'Saving…' : isConnected ? t('action.saveChanges') : 'Connect Sentry'}
          </Button>
        </Box>
      )}

      {/* Simulate error */}
      {isConnected && canEdit && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box sx={{ color: 'text.secondary', display: 'flex' }}><IconFlask size={18} /></Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('action.simulateError')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('hint.simulateError')}
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm>
              <TextField
                size="small" fullWidth
                label="Error message"
                placeholder="Test error from Arthur MCP Adapter"
                value={simulateMessage}
                onChange={(e) => setSimulateMessage(e.target.value)}
                disabled={simulating}
              />
            </Grid>
            <Grid item xs={12} sm="auto">
              <Select
                size="small"
                value={simulateLevel}
                onChange={(e) => setSimulateLevel(e.target.value)}
                disabled={simulating}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Button
                variant="outlined" size="small"
                onClick={handleSimulateError}
                disabled={simulating}
                startIcon={simulating ? <CircularProgress size={14} color="inherit" /> : <IconFlask size={16} />}
                sx={{ height: 40 }}
              >
                {simulating ? t('action.simulatingError') : t('action.simulateError')}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Danger zone */}
      {isConnected && can(Permission.ErrorTrackingDelete) && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderColor: 'error.light' }}>
          <Typography variant="subtitle1" fontWeight={700} color="error.main" gutterBottom>
            Danger zone
          </Typography>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="body2" fontWeight={600}>Disconnect Sentry</Typography>
              <Typography variant="body2" color="text.secondary">{t('hint.deleteWarning')}</Typography>
            </Box>
            <Button
              variant="outlined" size="small" color="error" sx={{ flexShrink: 0 }}
              startIcon={disconnecting ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={16} />}
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? 'Removing…' : 'Disconnect'}
            </Button>
          </Box>
        </Paper>
      )}

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
