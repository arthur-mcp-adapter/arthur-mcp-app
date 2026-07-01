import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconX,
  IconSearch,
  IconRocket,
  IconArrowLeft,
  IconExternalLink,
  IconCircleCheck,
} from '@tabler/icons-react'
import api from '../../api'
import { useAuth, Permission } from '../../context/AuthContext'
import { API_TEMPLATES, ApiTemplate, SERVER_TEMPLATE_SOURCE_TAG, TEMPLATE_CATEGORIES, buildToolPayload } from '../../data/api-templates'
import { SecretAutocomplete, useSecrets } from '../../features/secrets'

// ─── Auth badge ───────────────────────────────────────────────────────────────

const AUTH_LABEL_KEYS: Record<string, string> = {
  none: 'template.authNone',
  bearer: 'template.authBearer',
  'api-key': 'template.authApiKey',
  basic: 'template.authBasic',
}

type AuthChipColor = 'default' | 'primary' | 'warning' | 'error'

const AUTH_CHIP_COLORS: Record<string, AuthChipColor> = {
  none: 'default',
  bearer: 'primary',
  'api-key': 'warning',
  basic: 'error',
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ template, onUse }: { template: ApiTemplate; onUse: (tmpl: ApiTemplate) => void }) {
  const { can } = useAuth()
  const { t } = useTranslation('servers')
  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        transition: 'border-color 0.18s',
        '&:hover': { borderColor: template.color },
      }}
    >
      {/* Icon + heading */}
      <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
        <Box
          sx={{
            width: 46, height: 46, borderRadius: 2, flexShrink: 0,
            bgcolor: 'action.hover',
            border: '1.5px solid',
            borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', lineHeight: 1,
          }}
        >
          {template.emoji}
        </Box>
        <Box minWidth={0}>
          <Typography fontWeight={700} fontSize="0.95rem" noWrap>{template.name}</Typography>
          <Typography fontSize="0.75rem" color="text.secondary" noWrap>{template.tagline}</Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" fontSize="0.81rem" mb={2} sx={{ lineHeight: 1.5, flexGrow: 1 }}>
        {template.description}
      </Typography>

      <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center" mb={2}>
        <Chip
          label={t(AUTH_LABEL_KEYS[template.auth.type] as Parameters<typeof t>[0])}
          size="small"
          color={AUTH_CHIP_COLORS[template.auth.type]}
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
        />
        <Chip
          label={t('label.toolCount', { count: template.tools.length })}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 20 }}
        />
      </Box>

      <Box display="flex" gap={1}>
        {template.docsUrl && (
          <Tooltip title={t('template.viewDocs')}>
            <IconButton
              size="small"
              color="inherit"
              href={template.docsUrl}
              target="_blank"
              rel="noreferrer"
              component="a"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ color: 'text.secondary' }}
            >
              <IconExternalLink size={18} />
            </IconButton>
          </Tooltip>
        )}
        {can(Permission.TemplatesUse) && (
          <Button variant="outlined" size="small" fullWidth onClick={() => onUse(template)}>
            {t('action.useTemplate')}
          </Button>
        )}
      </Box>
    </Paper>
  )
}

// ─── Use-template dialog ──────────────────────────────────────────────────────

function UseTemplateDialog({
  template,
  onClose,
}: {
  template: ApiTemplate
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation('servers')
  const [serverName, setProjectName] = useState(template.name)
  const [authValue, setAuthValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const { secrets, loading: loadingSecrets } = useSecrets()

  const needsAuth = template.auth.type !== 'none'
  const canCreate = !!serverName.trim() && !creating && (!needsAuth || !!authValue.trim())

  const handleCreate = async () => {
    if (!serverName.trim() || creating) return
    setCreating(true)
    setError('')

    const total = template.tools.length + 2
    let done = 0

    const tick = (label: string) => {
      done++
      setProgress(Math.round((done / total) * 100))
      setProgressLabel(label)
    }

    try {
      // 1. Create server
      tick(t('template.creatingServer'))
      const { data: server } = await api.post('/swagger/servers', {
        name: serverName.trim(),
        baseUrl: template.baseUrl,
        description: template.description,
        tags: [SERVER_TEMPLATE_SOURCE_TAG, `template:${template.name}`],
      })

      // 2. Set auth credentials
      if (template.auth.type !== 'none') {
        tick(t('template.configuring'))
        const authPayload =
          template.auth.type === 'bearer'
            ? { type: 'bearer', token: authValue }
            : template.auth.type === 'api-key'
            ? { type: 'api-key', name: template.auth.keyName ?? 'X-Api-Key', value: authValue, in: template.auth.keyIn ?? 'header' }
            : { type: 'none' }
        await api.patch(`/swagger/servers/${server._id}/auth`, authPayload)
      } else {
        tick(t('template.noAuthRequired'))
      }

      // 3. Create tools sequentially
      for (const toolDef of template.tools) {
        tick(t('template.addingTool', { name: toolDef.name }))
        const payload = buildToolPayload(toolDef, template.baseUrl)
        await api.post(`/swagger/servers/${server._id}/tools`, payload)
      }

      navigate(`/servers/${server._id}`)
    } catch (err: any) {
      setCreating(false)
      setError(err?.response?.data?.message ?? t('error.createTemplateError'))
    }
  }

  return (
    <Drawer anchor="right" open onClose={!creating ? onClose : undefined}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 560 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{template.emoji}</Box>
        <Box flexGrow={1}>
          <Typography fontWeight={700} fontSize="1.05rem">{template.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('template.toolsPreConfigured', { count: template.tools.length })}
          </Typography>
        </Box>
        <Tooltip title={t('template.close')}>
          <IconButton size="small" onClick={onClose} disabled={creating}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {creating ? (
          <Box py={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>{progressLabel}</Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 6 }} />
          </Box>
        ) : (
          <>
            <TextField
              size="small"
              fullWidth
              autoFocus
              label={t('template.serverName')}
              value={serverName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
              sx={{ mb: 2 }}
            />

            {needsAuth ? (
              <Box>
                <SecretAutocomplete
                  value={authValue}
                  onChange={setAuthValue}
                  label={template.auth.type === 'api-key' ? t('template.labelApiKey') : t('template.labelToken')}
                  secrets={secrets}
                  loadingSecrets={loadingSecrets}
                />
                {template.auth.hint && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    {template.auth.hint}{' '}
                    {template.signupUrl && (
                      <a href={template.signupUrl} target="_blank" rel="noreferrer">{t('template.getOneHere')}</a>
                    )}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={0.75} py={0.5}>
                <IconCircleCheck size={16} color="green" />
                <Typography variant="body2" color="success.main">{t('template.noAuthReady')}</Typography>
              </Box>
            )}

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                {t('template.toolsCreated')}
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {template.tools.map((t) => (
                  <Chip key={t.name} label={t.name} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20, fontFamily: 'monospace' }} />
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={onClose} disabled={creating}>{t('template.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate}
          startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <IconRocket size={18} />}
        >
          {creating ? t('template.creating') : t('template.create')}
        </Button>
      </Box>
    </Drawer>
  )
}

// ─── Templates page ───────────────────────────────────────────────────────────

export default function Templates() {
  const navigate = useNavigate()
  const { t } = useTranslation('servers')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<ApiTemplate | null>(null)

  const filtered = API_TEMPLATES.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tagline.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || t.category === category
    return matchSearch && matchCat
  })

  return (
    <Box>
      <Box mb={2}>
        <Button startIcon={<IconArrowLeft size={18} />} size="small" onClick={() => navigate('/')}>
          {t('action.backToServers')}
        </Button>
      </Box>

      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom letterSpacing="-0.2px">
            {t('heading.templates')}
          </Typography>
          <Typography color="text.secondary" maxWidth={560}>
            {t('template.preconfiguredHint')}
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder={t('placeholder.searchTemplates')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Category filter */}
      <Box display="flex" gap={0.75} flexWrap="wrap" mb={3}>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            clickable
            color={category === cat ? 'primary' : 'default'}
            onClick={() => setCategory(cat)}
          />
        ))}
      </Box>

      {/* Grid */}
      <Grid container spacing={2}>
        {filtered.map((t) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
            <TemplateCard template={t} onUse={setSelected} />
          </Grid>
        ))}

        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center" py={10}>
              {t('template.noMatch', { query: search || category })}
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Drawer */}
      {selected && <UseTemplateDialog template={selected} onClose={() => setSelected(null)} />}
    </Box>
  )
}
