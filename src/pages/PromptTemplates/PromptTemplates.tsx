import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconArrowLeft,
  IconSearch,
  IconPlus,
  IconTag,
  IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import type { PromptTemplate } from '../../data/promptTemplate.interface'
import {
  loadPromptTemplate,
  matchesTemplateSearch,
  usePromptTemplateCatalog,
} from '../../features/templates'
import type { PromptTemplateCardProps } from './promptTemplateCardProps.interface'
import type { UsePromptTemplateDrawerProps } from './usePromptTemplateDrawerProps.interface'
import { CATEGORY_COLOR } from './constants/categoryColor.constant'



// ─── Template card ────────────────────────────────────────────────────────────

function PromptTemplateCard({ template, loading, onUse }: PromptTemplateCardProps) {
  const { t } = useTranslation('prompts')
  const { can } = useAuth()
  const color = CATEGORY_COLOR[template.category] ?? '#5D87FF'

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.18s',
        '&:hover': { borderColor: color },
      }}
    >
      <Box sx={{ p: 2, flexGrow: 1 }}>
        {/* Icon + heading */}
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Box sx={{
            width: 46, height: 46, borderRadius: 2, flexShrink: 0,
            bgcolor: `${color}18`, border: `1.5px solid ${color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', lineHeight: 1,
          }}>
            {template.emoji}
          </Box>
          <Box minWidth={0}>
            <Typography fontWeight={700} fontSize="0.9375rem" noWrap>{template.name}</Typography>
            <Typography fontSize="0.75rem" color="text.secondary" noWrap>{template.tagline}</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" fontSize="0.81rem" mb={2} sx={{ lineHeight: 1.5 }}>
          {template.description}
        </Typography>

        <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
          <Chip
            label={template.category}
            size="small"
            sx={{
              bgcolor: `${color}18`, color, borderColor: `${color}40`,
              fontSize: '0.7rem', height: 20, fontWeight: 600,
              border: `1px solid ${color}40`,
            }}
          />
          {template.tags.slice(0, 2).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined"
              icon={<IconTag size={10} />}
              sx={{ fontSize: '0.68rem', height: 20, '& .MuiChip-icon': { ml: '4px', mr: '-2px' } }}
            />
          ))}
        </Box>
      </Box>

      <Box px={2} pb={2}>
        {can(Permission.PromptsCreate) && (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={() => onUse(template.id)}
          >
            {t('action.useTemplate')}
          </Button>
        )}
      </Box>
    </Paper>
  )
}

// ─── Use-template drawer ──────────────────────────────────────────────────────

function UsePromptTemplateDrawer({ template, onClose }: UsePromptTemplateDrawerProps) {
  const { t } = useTranslation('prompts')
  const navigate = useNavigate()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const canCreate = !!name.trim() && !creating

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true); setError('')
    try {
      await api.post('/prompts', {
        name: name.trim(),
        description: description.trim() || undefined,
        content: template.content,
        tags: template.tags,
      })
      navigate('/prompts')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('error.createFailed'))
      setCreating(false)
    }
  }

  return (
    <Drawer anchor="right" open onClose={!creating ? onClose : undefined}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 520 }, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{template.emoji}</Box>
        <Box flexGrow={1} minWidth={0}>
          <Typography fontWeight={700} fontSize="1.05rem" noWrap>{template.name}</Typography>
          <Typography variant="caption" color="text.secondary">{template.category}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={creating}><IconX size={18} /></IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          size="small" fullWidth autoFocus required
          label={t('placeholder.promptNameField')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
          helperText={t('hint.renameHint')}
        />

        <TextField
          size="small" fullWidth multiline minRows={4} maxRows={10}
          label={t('label.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Tags preview */}
        {template.tags.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
              {t('label.tags')}
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {template.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" icon={<IconTag size={10} />}
                  sx={{ fontSize: '0.7rem', height: 20, '& .MuiChip-icon': { ml: '4px', mr: '-2px' } }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Content preview */}
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            {t('label.contentPreview')}
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography
              variant="caption" fontFamily="monospace" color="text.secondary"
              sx={{
                display: '-webkit-box', WebkitLineClamp: 12, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.72rem', lineHeight: 1.6,
              }}
            >
              {template.content}
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
            {t('hint.editAfterCreate')}
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={onClose} disabled={creating}>{t('common:action.cancel')}</Button>
        <Button
          variant="contained" onClick={handleCreate} disabled={!canCreate}
          startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
        >
          {creating ? t('common:action.loading') : t('action.createPrompt')}
        </Button>
      </Box>
    </Drawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromptTemplates() {
  const { t } = useTranslation('prompts')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<PromptTemplate | null>(null)
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState(false)
  const { items, loading, error: catalogError, reload } = usePromptTemplateCatalog()
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((template) => template.category))).sort()],
    [items],
  )
  const filtered = useMemo(() => items.filter((template) => {
    const matchesCategory = category === 'All' || template.category === category
    const matchesSearch = matchesTemplateSearch(search, [
      template.name,
      template.tagline,
      template.description,
      template.category,
      ...template.tags,
      ...template.searchTerms,
    ])
    return matchesCategory && matchesSearch
  }), [category, items, search])

  const handleUseTemplate = async (id: string) => {
    setLoadingTemplateId(id)
    setDetailError(false)
    try {
      setSelected(await loadPromptTemplate(id))
    } catch {
      setDetailError(true)
    } finally {
      setLoadingTemplateId(null)
    }
  }

  return (
    <Box py={3}>
      <Box mb={2}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/prompts')}>
          {t('action.backToPrompts')}
        </Button>
      </Box>

      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom letterSpacing="-0.2px">
            {t('heading.templates')}
          </Typography>
          <Typography color="text.secondary" maxWidth={560}>
            {t('heading.templatesSubtitle')}
          </Typography>
        </Box>
        <TextField
          size="small" placeholder={t('placeholder.searchTemplates')} value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 220 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
          }}
        />
      </Box>

      {/* Category filter */}
      <Box display="flex" gap={0.75} flexWrap="wrap" mb={3}>
        {categories.map((cat) => (
          <Chip
            key={cat} label={cat} size="small" clickable
            color={category === cat ? 'primary' : 'default'}
            onClick={() => setCategory(cat)}
          />
        ))}
      </Box>

      {detailError && <Alert severity="error" sx={{ mb: 2 }}>{t('error.loadTemplateDetail')}</Alert>}

      {catalogError ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={10}>
          <Alert severity="error">{t('error.loadTemplateCatalog')}</Alert>
          <Button variant="contained" onClick={reload}>{t('common:action.retry')}</Button>
        </Box>
      ) : loading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item}>
              <Skeleton variant="rectangular" height={230} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((template) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
              <PromptTemplateCard
                template={template}
                loading={loadingTemplateId === template.id}
                onUse={handleUseTemplate}
              />
            </Grid>
          ))}
          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" textAlign="center" py={10}>
                {t('empty.noTemplatesMatch', { query: search || category })}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {selected && <UsePromptTemplateDrawer template={selected} onClose={() => setSelected(null)} />}
    </Box>
  )
}
