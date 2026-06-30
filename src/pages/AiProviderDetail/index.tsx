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
  Paper,
  Snackbar,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  IconRobot,
  IconSettings,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/AuthContext'
import api from '../../api'
import { useDetailPageNav } from '../../hooks/useDetailPageNav'
import type { AiProvider, AiProviderType } from '../../features/aiProviders'
import Swal from 'sweetalert2'

const PROVIDER_TYPES: AiProviderType[] = ['openai', 'anthropic', 'gemini', 'mistral', 'groq', 'azure', 'custom']

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d97559',
  gemini: '#1a73e8',
  mistral: '#ff6b35',
  groq: '#f55036',
  azure: '#0078d4',
  custom: '#7c3aed',
}

// ─── Tab 0 — Overview ─────────────────────────────────────────────────────────

function OverviewTab({ provider }: { provider: AiProvider }) {
  const { t } = useTranslation(['aiProviders', 'common'])
  const color = PROVIDER_COLORS[provider.provider] ?? '#7c3aed'

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('label.provider')}</Typography>
          <Chip
            label={t(`provider.${provider.provider}`)}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 600,
              bgcolor: `${color}18`,
              color,
              border: `1px solid ${color}40`,
            }}
          />
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.model')}</Typography>
          <Typography variant="body2" fontFamily="monospace">{provider.model}</Typography>
        </Box>
        <Divider />
        {provider.baseUrl && (
          <>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">{t('label.baseUrl')}</Typography>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem">{provider.baseUrl}</Typography>
            </Box>
            <Divider />
          </>
        )}
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{t('label.isActive')}</Typography>
          <Chip
            label={provider.isActive ? t('common:status.active') : t('common:label.inactive')}
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

function SettingsTab({ provider, onUpdated }: { provider: AiProvider; onUpdated: (p: AiProvider) => void }) {
  const { t } = useTranslation(['aiProviders', 'common'])
  const navigate = useNavigate()
  const { can } = useAuth()
  const [editName, setEditName] = useState(provider.name)
  const [editDescription, setEditDescription] = useState(provider.description ?? '')
  const [editProvider, setEditProvider] = useState<AiProviderType>(provider.provider)
  const [editModel, setEditModel] = useState(provider.model)
  const [editBaseUrl, setEditBaseUrl] = useState(provider.baseUrl ?? '')
  const [editIsActive, setEditIsActive] = useState(provider.isActive)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  const canEdit = can(Permission.AiProvidersEdit)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch<AiProvider>(`/ai-providers/${provider.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        provider: editProvider,
        model: editModel.trim(),
        baseUrl: editBaseUrl.trim() || undefined,
        isActive: editIsActive,
      })
      onUpdated(data)
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
      await api.delete(`/ai-providers/${provider.id}`)
      navigate('/ai-providers')
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
              {t('label.provider')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={editProvider}
              onChange={(_e, val) => { if (val && canEdit) setEditProvider(val) }}
              sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { borderRadius: '6px !important', border: '1px solid !important', borderColor: 'divider !important', '&.Mui-selected': { borderColor: 'primary.main !important' } } }}
            >
              {PROVIDER_TYPES.map((pt) => (
                <ToggleButton
                  key={pt} value={pt} disableRipple
                  disabled={!canEdit}
                  sx={{ px: 1.5, py: 0.75, fontSize: '0.78rem', fontWeight: 500, textTransform: 'none', lineHeight: 1.3, '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(26,115,232,0.08)' } }}
                >
                  {t(`provider.${pt}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              label={t('label.model')}
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              placeholder={t('placeholder.model')}
              disabled={!canEdit}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              label={t('label.baseUrl')}
              value={editBaseUrl}
              onChange={(e) => setEditBaseUrl(e.target.value)}
              placeholder={t('placeholder.baseUrl')}
              helperText={t('hint.baseUrlOptional')}
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

      {can(Permission.AiProvidersDelete) && (
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

export default function AiProviderDetail() {
  const { t } = useTranslation('aiProviders')
  const { id } = useParams<{ id: string }>()
  const [provider, setProvider] = useState<AiProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!id) return
    api.get<AiProvider>(`/ai-providers/${id}`)
      .then((r) => setProvider(r.data))
      .finally(() => setLoading(false))
  }, [id])

  useDetailPageNav(() => {
    if (!provider) return null
    return {
      name: provider.name,
      sourceEmoji: '🤖',
      sourceColor: PROVIDER_COLORS[provider.provider] ?? '#7c3aed',
      backLabel: t('nav.backLabel'),
      backPath: '/ai-providers',
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

  const color = PROVIDER_COLORS[provider.provider] ?? '#7c3aed'

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          display="flex" alignItems="center" gap={0.75}
          px={2} py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Chip
            label={t(`provider.${provider.provider}`)}
            size="small"
            icon={<IconRobot size={12} />}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 600,
              bgcolor: `${color}18`, color,
              border: `1px solid ${color}40`,
            }}
          />
          <Chip
            label={provider.model}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem', fontFamily: 'monospace' }}
          />
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
