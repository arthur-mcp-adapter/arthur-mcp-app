import { useState, useEffect } from 'react'
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconActivity,
  IconEye,
  IconEyeOff,
  IconExternalLink,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/auth'
import api from '../../api'
import { useDetailPageNav } from '../../hooks'
import { PROVIDER_COLORS, type ObservabilityProvider, type ObservabilityProviderType } from '../../features/observability'
import Swal from 'sweetalert2'
import type { OverviewTabProps } from './overviewTabProps.interface'
import type { SettingsTabProps } from './settingsTabProps.interface'
import { PROVIDER_TYPES } from './constants/providerTypes.constant'



// ─── Tab 0 — Overview ─────────────────────────────────────────────────────────

function OverviewTab({ provider }: OverviewTabProps) {
  const { t } = useTranslation('observability')
  const color = PROVIDER_COLORS[provider.type] ?? '#6b7280'

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('label.type')}</Typography>
          <Chip
            label={t(`type.${provider.type}`)}
            size="small"
            sx={{
              height: 22, fontSize: '0.72rem', fontWeight: 600,
              bgcolor: `${color}18`, color, border: `1px solid ${color}40`,
            }}
          />
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('label.url')}</Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem">{provider.url}</Typography>
            <Tooltip title={t('action.openDashboard')}>
              <IconButton
                size="small"
                component="a"
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ p: 0.25, color: 'text.disabled' }}
              >
                <IconExternalLink size={13} />
              </IconButton>
            </Tooltip>
          </Box>
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
  const { t } = useTranslation('observability')
  const navigate = useNavigate()
  const { can } = useAuth()
  const [editName, setEditName] = useState(provider.name)
  const [editDescription, setEditDescription] = useState(provider.description ?? '')
  const [editType, setEditType] = useState<ObservabilityProviderType>(provider.type)
  const [editUrl, setEditUrl] = useState(provider.url)
  const [editApiKey, setEditApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [editIsActive, setEditIsActive] = useState(provider.isActive)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  const canEdit = can(Permission.ObservabilityEdit)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch<ObservabilityProvider>(`/observability-providers/${provider.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        type: editType,
        url: editUrl.trim(),
        apiKey: editApiKey.trim() || undefined,
        isActive: editIsActive,
      })
      onUpdated(data)
      setEditApiKey('')
      setSnack({ msg: t('toast.updated'), severity: 'success' })
    } catch {
      setSnack({ msg: t('error.saveFailed'), severity: 'error' })
    } finally {
      setSaving(false)
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
      await api.delete(`/observability-providers/${provider.id}`)
      navigate('/observability')
    } catch {
      setSnack({ msg: t('error.deleteFailed'), severity: 'error' })
    }
  }

  return (
    <>
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
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
              {t('label.type')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={editType}
              onChange={(_e, val) => { if (val && canEdit) setEditType(val) }}
              sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { borderRadius: '6px !important', border: '1px solid !important', borderColor: 'divider !important', '&.Mui-selected': { borderColor: 'primary.main !important' } } }}
            >
              {PROVIDER_TYPES.map((pt) => (
                <ToggleButton
                  key={pt} value={pt} disableRipple disabled={!canEdit}
                  sx={{ px: 1.5, py: 0.75, fontSize: '0.78rem', fontWeight: 500, textTransform: 'none', lineHeight: 1.3, '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(26,115,232,0.08)' } }}
                >
                  {t(`type.${pt}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" required
              label={t('label.url')}
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder={t('placeholder.url')}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small"
              label={t('label.apiKey')}
              type={showApiKey ? 'text' : 'password'}
              value={editApiKey}
              onChange={(e) => setEditApiKey(e.target.value)}
              placeholder="Leave empty to keep existing key"
              helperText={t('hint.apiKeyProtected')}
              disabled={!canEdit}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showApiKey ? t('common:action.hide') : t('common:action.show')}>
                      <IconButton size="small" onClick={() => setShowApiKey((v) => !v)} edge="end" disabled={!canEdit}>
                        {showApiKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
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
          <Box mt={2} display="flex" justifyContent="flex-end">
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

      {can(Permission.ObservabilityDelete) && (
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

export default function ObservabilityProviderDetail() {
  const { t } = useTranslation('observability')
  const { id } = useParams<{ id: string }>()
  const [provider, setProvider] = useState<ObservabilityProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!id) return
    api.get<ObservabilityProvider>(`/observability-providers/${id}`)
      .then((r) => setProvider(r.data))
      .finally(() => setLoading(false))
  }, [id])

  useDetailPageNav(() => {
    if (!provider) return null
    const color = PROVIDER_COLORS[provider.type] ?? '#6b7280'
    return {
      name: provider.name,
      sourceEmoji: '📊',
      sourceColor: color,
      backLabel: t('nav.backLabel'),
      backPath: '/observability',
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

  const color = PROVIDER_COLORS[provider.type] ?? '#6b7280'

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          display="flex" alignItems="center" gap={0.75}
          px={2} py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Chip
            label={t(`type.${provider.type}`)}
            size="small"
            icon={<IconActivity size={12} />}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 600,
              bgcolor: `${color}18`, color, border: `1px solid ${color}40`,
            }}
          />
          <Box display="flex" alignItems="center" gap={0.25}>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontSize="0.7rem">
              {provider.url}
            </Typography>
            <Tooltip title={t('action.openDashboard')}>
              <IconButton
                size="small"
                component="a"
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ p: 0.25, color: 'text.disabled' }}
              >
                <IconExternalLink size={12} />
              </IconButton>
            </Tooltip>
          </Box>
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
