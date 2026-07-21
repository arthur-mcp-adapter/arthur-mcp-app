import { useState } from 'react'
import {
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
  IconTag,
  IconSparkles,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { AppSnackbar, ConfirmDialog, HelpButton } from '../../components'
import { PromptCard, TagInput, type Prompt } from '../../features/prompts'
import { useListPageLogic } from '../../hooks'
import { useCopyToClipboard } from '../../hooks'

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Prompts() {
  const navigate = useNavigate()
  const { t } = useTranslation('prompts')
  const { can } = useAuth()
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const [state, handlers] = useListPageLogic({
    loadItems: () => api.get<Prompt[]>('/prompts').then((r) => r.data),
    deleteItem: (id) => api.delete(`/prompts/${id}`),
    permission: Permission.PromptsView,
  })

  const { copiedId, copy } = useCopyToClipboard({
    onError: (msg) => handlers.setSnack({ message: msg, severity: 'error' }),
  })

  const allTags = [...new Set(state.items.flatMap((p) => p.tags))].sort()

  const visible = state.items.filter((p) => {
    if (tagFilter && !p.tags.includes(tagFilter)) return false
    if (state.search) {
      const q = state.search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      )
    }
    return true
  })

  const openCreate = () => navigate('/prompts/new')
  const openEdit = (p: Prompt) => navigate(`/prompts/${p.id}`)

  const handleCopy = (p: Prompt) => copy(p.content, p.id)

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700}>{t('heading.title')}</Typography>
          <HelpButton title={t('heading.title')} docsRefs={[
            { en: 'Prompts', ptBR: 'Prompts' },
            { en: 'What-Are-Prompts', ptBR: 'O-que-sao-Prompts' },
            { en: 'How-to-Create-and-Link-a-Prompt', ptBR: 'How-to-Create-and-Link-a-Prompt' },
          ]}>
            <Typography variant="body2" gutterBottom>{t('help.intro')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('help.howToUseTitle')}</strong></Typography>
            <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('help.step1')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.step2', { open: '{{', close: '}}' })}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.step3')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.step4')}</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom><strong>{t('help.successTitle')}</strong></Typography>
            <Typography variant="body2" gutterBottom>{t('help.success')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('help.goodToKnowTitle')}</strong></Typography>
            <Typography variant="body2" gutterBottom>{t('help.oneManyServers')}</Typography>
            <Typography variant="body2">{t('help.disableHint')}</Typography>
          </HelpButton>
        </Box>
        {can(Permission.PromptsCreate) && (
          <Box display="flex" gap={1}>
            <Button size="small" variant="outlined" startIcon={<IconSparkles size={16} />} onClick={() => navigate('/prompt-templates')}>
              {t('heading.templates')}
            </Button>
            <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={openCreate}>
              {t('action.newPrompt')}
            </Button>
          </Box>
        )}
      </Box>

      {/* Search + tag filter */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <TextField
          size="small" placeholder={t('placeholder.searchPrompts')} value={state.search}
          onChange={(e) => handlers.setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
          }}
        />
        {allTags.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
            <Chip
              label={t('filter.all')} size="small" clickable
              color={tagFilter === null ? 'primary' : 'default'}
              variant={tagFilter === null ? 'filled' : 'outlined'}
              onClick={() => setTagFilter(null)}
            />
            {allTags.map((tag) => (
              <Chip
                key={tag} label={tag} size="small" clickable
                icon={<IconTag size={10} />}
                color={tagFilter === tag ? 'primary' : 'default'}
                variant={tagFilter === tag ? 'filled' : 'outlined'}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                sx={{ '& .MuiChip-icon': { ml: '4px' } }}
              />
            ))}
          </Box>
        )}
        {(state.search || tagFilter) && (
          <Typography variant="body2" color="text.secondary" ml="auto">
            {visible.length} of {state.items.length}
          </Typography>
        )}
      </Box>

      {/* Content */}
      {state.loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : state.items.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">
            {t('empty.noPrompts', { defaultValue: 'No prompts yet. Click New prompt to create your first one.' })}
          </Typography>
        </Box>
      ) : visible.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">{t('empty.noMatch')}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {visible.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <PromptCard
                prompt={p}
                onEdit={openEdit}
                onCopy={handleCopy}
                onDelete={handlers.handleDeleteRequest}
                canEdit={can(Permission.PromptsEdit)}
                canDelete={can(Permission.PromptsDelete)}
                copied={copiedId === p.id}
              />
            </Grid>
          ))}
        </Grid>
      )}
      <ConfirmDialog
        open={state.deleteTarget !== null}
        title={t('confirm.deleteTitle', { name: state.deleteTarget?.name })}
        message={t('confirm.deleteMessage')}
        confirmLabel={t('common:action.delete')} confirmColor="error" loading={state.deleting}
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
