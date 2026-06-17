import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Typography,
} from '@mui/material'
import {
  IconSettings,
  IconMail,
  IconWorld,
  IconClock,
} from '@tabler/icons-react'
import api from '../api'
import HelpButton from '../components/HelpButton'
import AppSnackbar from '../components/AppSnackbar'

interface SettingsData {
  serverBaseUrl: string
  defaultTimeoutMs: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpFrom: string
  smtpPassSet: boolean
}

// ─── Inline-validated TextField wrapper ───────────────────────────────────────

import { TextField } from '@mui/material'

function emailValid(v: string) {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function portValid(v: number) {
  return v >= 1 && v <= 65535
}

export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  // Form state
  const [serverBaseUrl, setServerBaseUrl] = useState('')
  const [defaultTimeoutMs, setDefaultTimeoutMs] = useState(30000)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  // Dirty tracking — original values
  const [orig, setOrig] = useState<Omit<SettingsData, 'smtpPassSet'> & { smtpPass: string } | null>(null)

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
        setOrig({
          serverBaseUrl: r.data.serverBaseUrl || '',
          defaultTimeoutMs: r.data.defaultTimeoutMs || 30000,
          smtpHost: r.data.smtpHost || '',
          smtpPort: r.data.smtpPort || 587,
          smtpUser: r.data.smtpUser || '',
          smtpFrom: r.data.smtpFrom || '',
          smtpPass: '',
        })
      })
      .catch(() => {
        setSnackMsg('Failed to load settings.')
        setSnackSeverity('error')
        setSnackOpen(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const isDirty = orig !== null && (
    serverBaseUrl !== orig.serverBaseUrl ||
    defaultTimeoutMs !== orig.defaultTimeoutMs ||
    smtpHost !== orig.smtpHost ||
    smtpPort !== orig.smtpPort ||
    smtpUser !== orig.smtpUser ||
    smtpFrom !== orig.smtpFrom ||
    smtpPass !== ''
  )

  const smtpFromError = !emailValid(smtpFrom)
  const smtpPortError = !portValid(smtpPort)

  const handleSave = async () => {
    if (smtpFromError || smtpPortError) {
      setSnackMsg('Please fix validation errors before saving.')
      setSnackSeverity('error')
      setSnackOpen(true)
      return
    }
    setSaving(true)
    try {
      const dto: Record<string, unknown> = {
        serverBaseUrl: serverBaseUrl.trim(),
        defaultTimeoutMs: Number(defaultTimeoutMs),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
      }
      if (smtpPass) dto.smtpPass = smtpPass
      await api.patch('/settings', dto)
      setSnackMsg('Settings saved successfully.')
      setSnackSeverity('success')
      setSnackOpen(true)
      setSmtpPass('')
      setOrig({
        serverBaseUrl: serverBaseUrl.trim(),
        defaultTimeoutMs: Number(defaultTimeoutMs),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
        smtpPass: '',
      })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error saving.'
        : 'Error saving.'
      setSnackMsg(msg)
      setSnackSeverity('error')
      setSnackOpen(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="40vh"><CircularProgress /></Box>

  return (
    <Box py={3} px={0}>
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">Settings</Typography>
        <HelpButton title="Settings">
          <Typography variant="body2" gutterBottom>
            Global configuration for the entire Arthur MCP Adapter server. Changes saved here apply to <strong>all projects and all users</strong> — only administrators can access this page.
          </Typography>
          <Typography variant="body2" gutterBottom>
            This page has two sections:
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2"><strong>Server</strong> — the public URL of this instance and the default HTTP timeout for upstream API calls.</Typography></Box>
            <Box component="li"><Typography variant="body2"><strong>E-mail (SMTP)</strong> — credentials used to send password-reset emails.</Typography></Box>
          </Box>
          <Typography variant="body2">
            Always click <strong>Save settings</strong> at the bottom after making changes. Navigating away without saving will discard your edits.
          </Typography>
        </HelpButton>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2.5}>Global system settings — changes apply to all projects and users.</Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}><IconWorld size={18} /></Box>
          <Typography variant="subtitle1" fontWeight={700}>Server</Typography>
          <HelpButton title="Server settings">
            <Typography variant="body2" gutterBottom>
              <strong>Public Server URL</strong> — the externally reachable address of this Arthur instance (e.g. <code>https://mcp.my-company.com</code>). This URL is used in two places:
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>Password-reset emails:</strong> the reset link included in the email points to this URL + <code>/reset-password</code>. If the URL is wrong, users receive broken links.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>MCP endpoint display:</strong> some UI elements construct MCP endpoint URLs using this base. Set it to the address your users will actually use from their machines.</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Default timeout (ms)</strong> — how long Arthur waits for a response from the upstream API before cancelling the HTTP request and returning an error to the AI client. Default is 30,000 ms (30 seconds).
            </Typography>
            <Typography variant="body2">
              Increase the timeout for slow APIs (large file downloads, heavy queries). Decrease it to fail fast and free up resources. Very long timeouts can make AI clients appear unresponsive while they wait for Arthur to give up on a stalled request.
            </Typography>
          </HelpButton>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              size="small" fullWidth
              label="Public Server URL"
              placeholder="https://mcp.my-company.com"
              helperText="Used to generate curl examples and password reset links."
              value={serverBaseUrl}
              onChange={(e) => setServerBaseUrl(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconWorld size={16} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              size="small" fullWidth type="number"
              label="Default timeout (ms)"
              helperText="Max time per HTTP call."
              value={defaultTimeoutMs}
              onChange={(e) => setDefaultTimeoutMs(Number(e.target.value))}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconClock size={16} /></InputAdornment> }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* SMTP */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}><IconMail size={18} /></Box>
          <Typography variant="subtitle1" fontWeight={700}>E-mail (SMTP)</Typography>
          <HelpButton title="E-mail (SMTP)">
            <Typography variant="body2" gutterBottom>
              SMTP (Simple Mail Transfer Protocol) credentials used by Arthur to send transactional emails — currently only the password-reset flow. Without valid SMTP settings the "Forgot password" feature silently fails and users will not receive reset links.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Field guide:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>SMTP Host:</strong> your email provider's outbound mail server (e.g. <code>smtp.gmail.com</code>, <code>smtp.sendgrid.net</code>).</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Port:</strong> typically <code>587</code> for STARTTLS or <code>465</code> for SSL/TLS. Port 25 is usually blocked by cloud providers.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>SMTP User:</strong> the username or email address used to authenticate with the SMTP server.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>SMTP Password:</strong> the account's password. For Gmail, use an <em>App Password</em> instead of your Google account password (two-factor accounts require this).</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>From email:</strong> the sender address that appears in the user's inbox (e.g. <code>noreply@company.com</code>). Must be authorised to send from your SMTP account.</Typography></Box>
            </Box>
            <Typography variant="body2">
              If you already set a password previously, leave the password field blank to keep it unchanged. Enter a new value only when you need to rotate credentials.
            </Typography>
          </HelpButton>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Required for sending password reset emails.
          {data?.smtpPassSet && ' SMTP password already set — leave blank to keep it.'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField size="small" fullWidth label="SMTP Host" placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              size="small" fullWidth type="number" label="Port"
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
              error={smtpPortError}
              helperText={smtpPortError ? 'Port must be between 1 and 65535' : ''}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" fullWidth label="SMTP User" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              size="small" fullWidth type="password"
              label={data?.smtpPassSet ? 'New SMTP password (blank = keep)' : 'SMTP Password'}
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              size="small" fullWidth
              label='Sender email ("From:")'
              placeholder="noreply@company.com"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              error={smtpFromError}
              helperText={smtpFromError ? 'Invalid email format' : ''}
            />
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 0 }} />

      {/* Sticky save bar */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 2,
          zIndex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          boxShadow: isDirty ? '0 -4px 16px rgba(0,0,0,0.07)' : 'none',
          transition: 'box-shadow 0.2s',
        }}
      >
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !isDirty}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconSettings size={18} />}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </Box>

      <AppSnackbar
        open={snackOpen}
        message={snackMsg}
        severity={snackSeverity}
        onClose={() => setSnackOpen(false)}
      />
    </Box>
  )
}
