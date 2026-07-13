import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconPlus,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { HelpButton } from '../../components'
import { ConfirmDialog } from '../../components'
import { AppSnackbar } from '../../components'
import { ProjectCard } from '../../features/server/ProjectCard'
import { useApiTemplateCatalog } from '../../features/templates'
import { useListPageLogic } from '../../hooks'
import type { Project } from '../../features/server/types'

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function ProjectsSkeleton() {
  return (
    <Grid container spacing={2}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Servers() {
  const [error, setError] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState('')
  const navigate = useNavigate()
  const { can, loading: authLoading } = useAuth()
  const { t } = useTranslation(['servers', 'common'])

  const [state, handlers] = useListPageLogic({
    loadItems: async () => {
      setError(null)
      try {
        const { data } = await api.get<Project[]>('/swagger/servers')
        return data
      } catch (err: any) {
        if (err?.response?.status === 403) setError('forbidden')
        else setError(t('servers:error.loadFailed'))
        throw err
      }
    },
    deleteItem: (id) => api.delete(`/swagger/servers/${id}`),
    permission: Permission.ServersView,
    getItemId: (p: Project) => p._id,
  })
  const needsTemplateSummaries = state.items.some((project) =>
    (project.tags ?? []).some((tag) => tag.startsWith('template:')),
  )
  const { items: templateSummaries } = useApiTemplateCatalog(needsTemplateSummaries)

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.post<Project>(`/swagger/servers/${id}/duplicate`)
      handlers.setItems([res.data, ...state.items])
      handlers.setSnack({ message: t('servers:toast.duplicated', { name: res.data.name }), severity: 'success' })
    } catch {
      handlers.setSnack({ message: t('servers:toast.duplicateFailed'), severity: 'error' })
    }
  }

  const handleDeleteProject = (id: string) => {
    const project = state.items.find(p => p._id === id)
    if (project) handlers.handleDeleteRequest(project)
  }

  // All unique tags
  const allTags = Array.from(new Set(state.items.flatMap((p) => p.tags ?? [])))

  // Client-side filter
  const filtered = state.items.filter((p) => {
    const matchSearch = !state.search || p.name.toLowerCase().includes(state.search.toLowerCase()) || p.description?.toLowerCase().includes(state.search.toLowerCase())
    const matchTag = !tagFilter || (p.tags ?? []).includes(tagFilter)
    return matchSearch && matchTag
  })

  const confirmProjectName = state.items.find((p) => p._id === state.deleteTarget?._id)?.name ?? 'this server'

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('servers:heading.title')}</Typography>
          <HelpButton title={t('servers:heading.title')}>
            <Typography variant="body2" gutterBottom>{t('servers:help.intro')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('servers:help.howItWorks')}</strong></Typography>
            <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('servers:help.step1')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.step2')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.step3')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.step4')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.step5')}</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom><strong>{t('servers:help.cardIndicators')}</strong></Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('servers:help.colouredDot')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.activePaused')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.toolCount')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('servers:help.tags')}</Typography></Box>
            </Box>
            <Typography variant="body2">{t('servers:help.newServerHint')}</Typography>
          </HelpButton>
        </Box>
        <Box display="flex" gap={1}>
          {can(Permission.TemplatesUse) && (
            <Button variant="outlined" startIcon={<IconSparkles size={18} />} onClick={() => navigate('/templates')}>
              {t('servers:action.browseTemplates')}
            </Button>
          )}
          {can(Permission.ServersCreate) && (
            <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/servers/new')}>
              {t('servers:action.newServer')}
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          size="small" placeholder={t('servers:placeholder.search')}
          value={state.search} onChange={(e) => handlers.setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
        {allTags.length > 0 && (
          <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">{t('servers:label.tags')}</Typography>
            <Chip label={t('servers:label.all')} size="small" onClick={() => setTagFilter('')} color={tagFilter === '' ? 'primary' : 'default'} sx={{ cursor: 'pointer', height: 22 }} />
            {allTags.map((tag) => (
              <Chip key={tag} label={tag} size="small" onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                color={tagFilter === tag ? 'primary' : 'default'} sx={{ cursor: 'pointer', height: 22 }} />
            ))}
          </Box>
        )}
      </Box>

      {state.loading ? (
        <ProjectsSkeleton />
      ) : error === 'forbidden' || !can(Permission.ServersView) ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
          <Typography color="text.secondary" variant="h6">{t('servers:error.accessRestricted')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('servers:error.forbidden')}</Typography>
        </Box>
      ) : error ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={10}>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 560 }}>{error}</Alert>
          <Button variant="contained" onClick={() => { handlers.setItems([]); window.location.reload() }}>{t('common:action.reload')}</Button>
        </Box>
      ) : filtered.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={10}>
          {state.items.length === 0 ? (
            <>
              <Typography color="text.secondary" variant="h6">{t('servers:empty.noServers')}</Typography>
              {can(Permission.ServersCreate) && (
                <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/servers/new')}>
                  {t('servers:action.createFirst')}
                </Button>
              )}
            </>
          ) : (
            <Typography color="text.secondary">{t('servers:empty.noMatch')}</Typography>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p._id}>
              <ProjectCard
                p={p}
                onDelete={handleDeleteProject}
                onDuplicate={handleDuplicate}
                templateSummaries={templateSummaries}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        open={state.deleteTarget !== null}
        title={t('servers:confirm.deleteTitle')}
        message={t('servers:confirm.deleteMessage', { name: confirmProjectName })}
        confirmLabel={t('common:action.delete')}
        confirmColor="error"
        loading={state.deleting}
        onConfirm={handlers.handleDeleteConfirm}
        onClose={handlers.handleDeleteCancel}
      />

      <AppSnackbar
        open={state.snack !== null}
        message={state.snack?.message ?? ''}
        severity={state.snack?.severity ?? 'success'}
        onClose={() => handlers.setSnack(null)}
      />
    </Box>
  )
}
