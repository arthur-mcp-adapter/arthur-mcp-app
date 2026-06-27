import { useState, useEffect, KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import {
  IconCode,
  IconVariable,
  IconEye,
  IconLink,
  IconSettings,
  IconTag,
  IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useServerNav } from '../context/ServerNavContext'
import api from '../api'
import Swal from 'sweetalert2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface SwaggerProject {
  id: string
  name: string
  prompts?: Array<{ name: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVars(content: string): string[] {
  const matches = [...content.matchAll(/\{\{(\w+)\}\}/g)]
  return [...new Set(matches.map((m) => m[1]))]
}

// ─── Tag input (inline) ───────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const { t } = useTranslation('prompts')
  const [inputValue, setInputValue] = useState('')

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInputValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={tags.length ? 0.75 : 0}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onDelete={() => onChange(tags.filter((t) => t !== tag))}
            deleteIcon={<IconX size={12} />}
            sx={{ fontSize: '0.72rem', height: 22 }}
          />
        ))}
      </Box>
      <TextField
        size="small"
        fullWidth
        placeholder={t('placeholder.addTag')}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconTag size={15} />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  )
}

// ─── Tab 0 — Editor ───────────────────────────────────────────────────────────

function EditorTab({
  content,
  onContentChange,
  onSave,
  dirty,
  saving,
}: {
  content: string
  onContentChange: (v: string) => void
  onSave: () => void
  dirty: boolean
  saving: boolean
}) {
  const { t } = useTranslation('prompts')
  const detectedVars = extractVars(content)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography fontWeight={600} fontSize="0.875rem">{t('label.promptContent')}</Typography>
        {dirty && (
          <Button
            size="small"
            variant="contained"
            onClick={onSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? t('common:action.saving') : t('common:action.save')}
          </Button>
        )}
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={12}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        sx={{
          '& .MuiInputBase-root': {
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          },
        }}
      />
      {detectedVars.length > 0 && (
        <Box display="flex" alignItems="center" gap={0.75} mt={1.5} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">{t('label.detectedVariables')}</Typography>
          {detectedVars.map((v) => (
            <Chip
              key={v}
              label={`{{${v}}}`}
              size="small"
              sx={{ height: 20, fontFamily: 'monospace', fontSize: '0.72rem' }}
            />
          ))}
        </Box>
      )}
    </Paper>
  )
}

// ─── Tab 1 — Variables ────────────────────────────────────────────────────────

function VariablesTab({ content }: { content: string }) {
  const { t } = useTranslation('prompts')
  const detectedVars = extractVars(content)

  if (detectedVars.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Typography color="text.secondary" variant="body2">
          {t('empty.noVariables', { open: '{{', close: '}}' })}
        </Typography>
      </Box>
    )
  }

  return (
    <Paper variant="outlined">
      {detectedVars.map((v, i) => (
        <Box
          key={v}
          display="flex"
          alignItems="center"
          gap={2}
          px={2}
          py={1.5}
          sx={{
            borderBottom: i < detectedVars.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Chip
            label={`{{${v}}}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', height: 22, flexShrink: 0 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {t('label.stringParameter')}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

// ─── Tab 2 — Preview ──────────────────────────────────────────────────────────

function PreviewTab({ content }: { content: string }) {
  const { t } = useTranslation('prompts')
  const detectedVars = extractVars(content)
  const [values, setValues] = useState<Record<string, string>>({})
  const [rendered, setRendered] = useState<string | null>(null)

  const handleRender = () => {
    let result = content
    for (const v of detectedVars) {
      result = result.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), values[v] ?? '')
    }
    setRendered(result)
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {detectedVars.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={600} fontSize="0.875rem" mb={1.5}>{t('label.variableValues')}</Typography>
          <Grid container spacing={1.5}>
            {detectedVars.map((v) => (
              <Grid item xs={12} sm={6} key={v}>
                <TextField
                  size="small"
                  fullWidth
                  label={`{{${v}}}`}
                  value={values[v] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                  InputLabelProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                />
              </Grid>
            ))}
          </Grid>
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button size="small" variant="contained" onClick={handleRender}>
              {t('action.render')}
            </Button>
          </Box>
        </Paper>
      )}

      {detectedVars.length === 0 && (
        <Box display="flex" justifyContent="flex-end">
          <Button size="small" variant="contained" onClick={handleRender}>
            {t('action.render')}
          </Button>
        </Box>
      )}

      {rendered !== null && (
        <Box
          sx={{
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {rendered}
        </Box>
      )}

      {rendered === null && detectedVars.length === 0 && (
        <Box
          sx={{
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            color: 'text.secondary',
          }}
        >
          {content || t('empty.emptyPrompt')}
        </Box>
      )}
    </Box>
  )
}

// ─── Tab 3 — Usage ────────────────────────────────────────────────────────────

function UsageTab({ promptName }: { promptName: string }) {
  const { t } = useTranslation('prompts')
  const [loading, setLoading] = useState(true)
  const [usages, setUsages] = useState<SwaggerProject[]>([])

  useEffect(() => {
    api.get<SwaggerProject[]>('/swagger/projects')
      .then(({ data }) => {
        const matched = data.filter((proj) =>
          (proj.prompts ?? []).some((p) => p.name === promptName)
        )
        setUsages(matched)
      })
      .catch(() => setUsages([]))
      .finally(() => setLoading(false))
  }, [promptName])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (usages.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Typography color="text.secondary" variant="body2">
          {t('empty.notReferenced')}
        </Typography>
      </Box>
    )
  }

  return (
    <Paper variant="outlined">
      {usages.map((proj, i) => (
        <Box
          key={proj.id}
          display="flex"
          alignItems="center"
          gap={1.5}
          px={2}
          py={1.5}
          sx={{
            borderBottom: i < usages.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Chip label={t('label.server')} size="small" color="primary" variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }} />
          <Typography variant="body2" fontWeight={500}>{proj.name}</Typography>
        </Box>
      ))}
    </Paper>
  )
}

// ─── Tab 4 — Settings ─────────────────────────────────────────────────────────

function SettingsTab({
  prompt,
  onUpdated,
}: {
  prompt: Prompt
  onUpdated: (p: Prompt) => void
}) {
  const { t } = useTranslation('prompts')
  const navigate = useNavigate()
  const [editName, setEditName] = useState(prompt.name)
  const [editDescription, setEditDescription] = useState(prompt.description ?? '')
  const [editTags, setEditTags] = useState<string[]>(prompt.tags)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    setEditName(prompt.name)
    setEditDescription(prompt.description ?? '')
    setEditTags(prompt.tags)
  }, [prompt])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const { data } = await api.patch<Prompt>(`/prompts/${prompt.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        tags: editTags,
      })
      onUpdated(data)
    } catch {
      // silent — parent will not update
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('confirm.deleteTitle', { name: prompt.name }),
      text: t('confirm.deleteCannotUndo'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common:action.delete'),
      confirmButtonColor: '#d32f2f',
      cancelButtonText: t('common:action.cancel'),
    })
    if (!result.isConfirmed) return
    await api.delete(`/prompts/${prompt.id}`)
    navigate('/prompts')
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} fontSize="0.875rem" mb={2}>{t('label.general')}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('label.name')}
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('label.description')}
              size="small"
              multiline
              minRows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              {t('label.tags')}
            </Typography>
            <TagInput tags={editTags} onChange={setEditTags} />
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
            {savingSettings ? t('common:action.saving') : t('action.saveChanges')}
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
        <Typography fontWeight={600} fontSize="0.875rem" color="error.main" mb={1}>
          {t('label.dangerZone')}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2">{t('action.deletePrompt')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('hint.cannotUndo')}
            </Typography>
          </Box>
          <Button size="small" color="error" variant="outlined" onClick={handleDelete}>
            {t('action.deletePrompt')}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('prompts')
  const { setServerDetail } = useServerNav()

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  // Editor state
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load prompt
  useEffect(() => {
    if (!id) return
    api.get<Prompt>(`/prompts/${id}`)
      .then(({ data }) => {
        setPrompt(data)
        setContent(data.content)
      })
      .catch(() => navigate('/prompts'))
      .finally(() => setLoading(false))
  }, [id])

  // Sync sidebar nav — runs whenever tab or prompt changes
  useEffect(() => {
    if (!prompt) return
    setServerDetail({
      name: prompt.name,
      sourceEmoji: '💬',
      sourceColor: '#5D87FF',
      backLabel: t('heading.title'),
      backPath: '/prompts',
      navItems: [
        { label: t('tab.editor'), icon: <IconCode size={17} />, idx: 0 },
        { label: t('tab.variables'), icon: <IconVariable size={17} />, idx: 1 },
        { label: t('tab.preview'), icon: <IconEye size={17} />, idx: 2 },
        { label: t('tab.usage'), icon: <IconLink size={17} />, idx: 3 },
        { label: t('tab.settings'), icon: <IconSettings size={17} />, idx: 4 },
      ],
      tab,
      onTabChange: (next) => setTab(next as number),
    })
  })

  // Cleanup on unmount
  useEffect(() => () => setServerDetail(null), [])

  const handleSave = async () => {
    if (!prompt) return
    setSaving(true)
    try {
      const { data } = await api.patch<Prompt>(`/prompts/${prompt.id}`, { content })
      setPrompt(data)
      setDirty(false)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (v: string) => {
    setContent(v)
    setDirty(true)
  }

  const handleUpdated = (updated: Prompt) => {
    setPrompt(updated)
    setContent(updated.content)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!prompt) return null

  const detectedVars = extractVars(content)

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        {/* Chips row */}
        <Box
          display="flex"
          alignItems="center"
          gap={0.75}
          px={2}
          py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {prompt.tags.length > 0
            ? prompt.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.7rem' }}
                />
              ))
            : (
              <Typography variant="caption" color="text.disabled">{t('label.noTags')}</Typography>
            )}
          <Box flexGrow={1} />
          {dirty && (
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ height: 26 }}
            >
              {saving ? t('common:action.saving') : t('common:action.save')}
            </Button>
          )}
          {detectedVars.length > 0 && (
            <Chip
              label={t('label.varsChip', { count: detectedVars.length })}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* Name + description */}
        <Box px={2} py={1.5}>
          <Typography fontWeight={700} fontSize="1.1rem">{prompt.name}</Typography>
          <Typography fontSize="0.82rem" color="text.secondary" mt={0.25}>
            {prompt.description || t('label.noDescription')}
          </Typography>
        </Box>
      </Paper>

      {/* Tab panels */}
      {tab === 0 && (
        <EditorTab
          content={content}
          onContentChange={handleContentChange}
          onSave={handleSave}
          dirty={dirty}
          saving={saving}
        />
      )}
      {tab === 1 && <VariablesTab content={content} />}
      {tab === 2 && <PreviewTab content={content} />}
      {tab === 3 && <UsageTab promptName={prompt.name} />}
      {tab === 4 && <SettingsTab prompt={prompt} onUpdated={handleUpdated} />}
    </Box>
  )
}
