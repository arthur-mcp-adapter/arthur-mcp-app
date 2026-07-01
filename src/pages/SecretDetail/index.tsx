import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconEye,
  IconEyeOff,
  IconLink,
  IconClock,
  IconSettings,
  IconCopy,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/AuthContext'
import api from '../../api'
import { useDetailPageNav } from '../../hooks/useDetailPageNav'
import type { Project } from '../../features/server/types'
import type { Secret } from '../../features/secrets'
import Swal from 'sweetalert2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  action: string
  resourceId?: string
  username?: string
  createdAt: string
}

// ─── Tab 0 — Overview ─────────────────────────────────────────────────────────

function OverviewTab({ secret }: { secret: Secret }) {
  const { t } = useTranslation('secrets')
  const [showValue, setShowValue] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [valueLoaded, setValueLoaded] = useState(false)
  const [valueDirty, setValueDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)
  const { can } = useAuth()

  const canReveal = can(Permission.SecretsRevealValues)
  const canEdit = can(Permission.SecretsEdit)

  const loadValue = async () => {
    if (valueLoaded || !canReveal) return
    try {
      const { data } = await api.get<{ value: string }>(`/secrets/${secret.id}/value`)
      setEditValue(data.value)
      setValueLoaded(true)
    } catch {
      setSnack({ msg: t('error.loadValueFailed'), severity: 'error' })
    }
  }

  const handleToggleValue = async () => {
    if (!showValue) await loadValue()
    setShowValue((v) => !v)
  }

  const handleSaveValue = async () => {
    setSaving(true)
    try {
      await api.patch(`/secrets/${secret.id}`, { value: editValue })
      setValueDirty(false)
      setSnack({ msg: t('toast.valueUpdated'), severity: 'success' })
    } catch {
      setSnack({ msg: t('error.saveFailed'), severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.secretValue')}</Typography>
        <TextField
          fullWidth
          size="small"
          label={t('common:label.value')}
          type={showValue ? 'text' : 'password'}
          value={editValue}
          disabled={!canEdit}
          placeholder={canReveal ? t('placeholder.revealToEdit') : t('placeholder.valueHidden')}
          onChange={e => { setEditValue(e.target.value); setValueDirty(true) }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('action.toggleVisibility')}>
                  <IconButton size="small" edge="end" onClick={handleToggleValue} disabled={!canReveal}>
                    {showValue ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        {valueDirty && canEdit && (
          <Box mt={1.5} display="flex" justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              onClick={handleSaveValue}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {t('action.updateValue')}
            </Button>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} fontSize="0.875rem" mb={1.5}>{t('label.metadata')}</Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('label.created')}</Typography>
            <Typography variant="body2">{new Date(secret.createdAt).toLocaleString()}</Typography>
          </Box>
          <Divider />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('label.lastUpdated')}</Typography>
            <Typography variant="body2">{new Date(secret.updatedAt).toLocaleString()}</Typography>
          </Box>
          <Divider />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{t('label.referenceKey')}</Typography>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.82rem">
              {`{{secret:${secret.name}}}`}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </>
  )
}

// ─── Tab 1 — Usage ───────────────────────────────────────────────────────────

function UsageTab({ secret }: { secret: Secret }) {
  const { t } = useTranslation('secrets')
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    const refs = `{{secret:${secret.name}}}`
    api.get<Project[]>('/swagger/projects')
      .then(r => {
        const all = r.data
        setProjects(all.filter((p: any) => JSON.stringify(p).includes(refs)))
      })
      .finally(() => setLoadingUsage(false))
  }, [secret.name])

  if (loadingUsage) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (projects.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Typography color="text.secondary" variant="body2">
          {t('empty.noUsage')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Typography variant="body2" color="text.secondary" mb={0.5}>
        {t('label.refUsageCount', { count: projects.length })}
      </Typography>
      {projects.map(p => (
        <Paper
          key={p._id}
          variant="outlined"
          onClick={() => navigate(`/servers/${p._id}`)}
          sx={{
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            transition: 'border-color 0.15s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <IconLink size={15} color="currentColor" style={{ opacity: 0.5, flexShrink: 0 }} />
          <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
        </Paper>
      ))}
    </Box>
  )
}

// ─── Tab 2 — Activity ─────────────────────────────────────────────────────────

function ActivityTab({ secret }: { secret: Secret }) {
  const { t } = useTranslation('secrets')
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  useEffect(() => {
    api.get('/audit-logs?limit=100')
      .then(r => {
        const raw: AuditLog[] = Array.isArray(r.data) ? r.data : (r.data.logs ?? [])
        const relevant = raw.filter(log =>
          log.resourceId === secret.id ||
          log.action?.toLowerCase().includes(secret.name.toLowerCase())
        )
        setFilteredLogs(relevant)
      })
      .finally(() => setLoadingLogs(false))
  }, [secret.id, secret.name])

  if (loadingLogs) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Paper variant="outlined">
      {filteredLogs.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">
            {t('empty.noActivity')}
          </Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('label.action')}</TableCell>
              <TableCell>{t('label.user')}</TableCell>
              <TableCell>{t('label.date')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem">
                    {log.action}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{log.username ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(log.createdAt).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  )
}

// ─── Tab 3 — Settings ────────────────────────────────────────────────────────

function SettingsTab({ secret, onUpdated }: { secret: Secret; onUpdated: (s: Secret) => void }) {
  const { t } = useTranslation('secrets')
  const navigate = useNavigate()
  const [editName, setEditName] = useState(secret.name)
  const [editDescription, setEditDescription] = useState(secret.description ?? '')
  const [savingSettings, setSavingSettings] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const { data } = await api.patch<Secret>(`/secrets/${secret.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
      onUpdated(data)
      setSnack({ msg: t('toast.settingsSaved'), severity: 'success' })
    } catch {
      setSnack({ msg: t('error.saveSettingsFailed'), severity: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('confirm.deleteTitle', { name: secret.name }),
      text: t('confirm.deleteSwalText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common:action.delete'),
      confirmButtonColor: '#d32f2f',
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/secrets/${secret.id}`)
      navigate('/secrets')
    } catch {
      setSnack({ msg: t('error.deleteSecretFailed'), severity: 'error' })
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('common:label.name')}
              size="small"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              helperText={t('hint.nameChangeWarning')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('common:label.description')}
              size="small"
              multiline
              minRows={4}
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
            />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            size="small"
            variant="contained"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            startIcon={savingSettings ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {t('action.saveChanges')}
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
        <Typography fontWeight={600} fontSize="0.875rem" color="error.main" mb={1}>
          {t('label.dangerZone')}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2">{t('action.deleteSecret')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('hint.deleteBreaksServers')}
            </Typography>
          </Box>
          <Button size="small" color="error" variant="outlined" onClick={handleDelete}>
            {t('action.deleteSecret')}
          </Button>
        </Box>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecretDetail() {
  const { t } = useTranslation('secrets')
  const { id } = useParams<{ id: string }>()
  const [secret, setSecret] = useState<Secret | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<Secret>(`/secrets/${id}`)
      .then(r => setSecret(r.data))
      .finally(() => setLoading(false))
  }, [id])

  useDetailPageNav(() => {
    if (!secret) return null
    return {
      name: secret.name,
      sourceEmoji: '🔑',
      sourceColor: '#FFAE1F',
      backLabel: t('nav.backLabel'),
      backPath: '/secrets',
      navItems: [
        { label: t('tab.overview'), icon: <IconEye size={17} />, idx: 0 },
        { label: t('tab.usage'), icon: <IconLink size={17} />, idx: 1 },
        { label: t('tab.activity'), icon: <IconClock size={17} />, idx: 2 },
        { label: t('tab.settings'), icon: <IconSettings size={17} />, idx: 3 },
      ],
      tab,
      onTabChange: (next: number) => setTab(next),
    }
  }, [secret, tab, t])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    )
  }

  if (!secret) {
    return (
      <Box py={8} textAlign="center">
        <Typography color="text.secondary">{t('empty.notFound')}</Typography>
      </Box>
    )
  }

  const handleCopyRef = () => {
    navigator.clipboard.writeText(`{{secret:${secret.name}}}`)
      .then(() => setSnack({ msg: t('toast.referenceCopied'), severity: 'success' }))
      .catch(() => setSnack({ msg: t('error.copyFailed'), severity: 'error' }))
  }

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          display="flex"
          alignItems="center"
          gap={0.75}
          px={2}
          py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tooltip title={t('action.copyReference')}>
            <Chip
              label={`{{secret:${secret.name}}}`}
              size="small"
              variant="outlined"
              icon={<IconCopy size={12} />}
              sx={{ fontFamily: 'monospace', height: 22, fontSize: '0.7rem', cursor: 'pointer' }}
              onClick={handleCopyRef}
            />
          </Tooltip>
          <Box flexGrow={1} />
          <Typography variant="caption" color="text.secondary">
            {t('label.updated', { date: new Date(secret.updatedAt).toLocaleDateString() })}
          </Typography>
        </Box>
        <Box px={2} py={1.5}>
          <Typography fontWeight={700} fontSize="1.1rem">{secret.name}</Typography>
          <Typography fontSize="0.82rem" color="text.secondary" mt={0.25}>
            {secret.description || t('label.noDescription')}
          </Typography>
        </Box>
      </Paper>

      {/* Tab content */}
      {tab === 0 && <OverviewTab secret={secret} />}
      {tab === 1 && <UsageTab secret={secret} />}
      {tab === 2 && <ActivityTab secret={secret} />}
      {tab === 3 && <SettingsTab secret={secret} onUpdated={setSecret} />}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
