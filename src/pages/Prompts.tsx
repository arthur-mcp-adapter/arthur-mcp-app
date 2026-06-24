import { useEffect, useState, KeyboardEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCopy,
  IconSearch,
  IconTag,
  IconMessage2,
  IconX,
  IconArrowsMaximize,
  IconArrowsMinimize,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import api from '../api'
import { useAuth, Permission } from '../context/AuthContext'
import { useColorMode } from '../theme/ColorModeContext'
import ConfirmDialog from '../components/ConfirmDialog'
import AppSnackbar from '../components/AppSnackbar'

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

// ─── Prompt card ──────────────────────────────────────────────────────────────

function PromptCard({ prompt, onEdit, onCopy, canEdit }: {
  prompt: Prompt
  onEdit: (p: Prompt) => void
  onCopy: (p: Prompt) => void
  canEdit: boolean
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 2px 12px rgba(93,135,255,0.12)',
          '& .card-actions': { opacity: 1 },
        },
      }}
    >
      {/* Hover actions */}
      <Box
        className="card-actions"
        sx={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.15s',
        }}
      >
        <Tooltip title="Copy content">
          <IconButton size="small" onClick={() => onCopy(prompt)}
            sx={{ p: 0.5, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
            <IconCopy size={15} />
          </IconButton>
        </Tooltip>
        {canEdit && (
          <Tooltip title="Edit prompt">
            <IconButton size="small" onClick={() => onEdit(prompt)}
              sx={{ p: 0.5, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
              <IconEdit size={15} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: '12px !important', pr: 5 }}>
        {/* Name */}
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Box sx={{ color: 'primary.main', flexShrink: 0 }}><IconMessage2 size={16} /></Box>
          <Typography fontWeight={700} fontSize="0.9375rem" noWrap lineHeight={1.3}>
            {prompt.name}
          </Typography>
        </Box>

        {/* Description */}
        {prompt.description && (
          <Typography
            variant="body2" color="text.secondary" mb={1}
            sx={{
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {prompt.description}
          </Typography>
        )}

        {/* Content preview */}
        <Paper variant="outlined" sx={{ p: 1, mb: 1, bgcolor: 'action.hover', borderRadius: '6px' }}>
          <Typography
            variant="caption"
            fontFamily="monospace"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              fontSize: '0.72rem',
              lineHeight: 1.5,
            }}
          >
            {prompt.content}
          </Typography>
        </Paper>

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {prompt.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                icon={<IconTag size={10} />}
                sx={{ fontSize: '0.68rem', height: 18, '& .MuiChip-icon': { ml: '4px', mr: '-2px' } }}
              />
            ))}
          </Box>
        )}

        {/* Meta */}
        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          {prompt.content.length} chars
          {prompt.updatedAt && ` · Updated ${new Date(prompt.updatedAt).toLocaleDateString()}`}
        </Typography>
      </CardContent>
    </Card>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
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
        placeholder='Add tag and press Enter or ","'
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><IconTag size={15} /></InputAdornment>,
        }}
      />
    </Box>
  )
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface PromptForm {
  name: string
  description: string
  content: string
  tags: string[]
}

function PromptDialog({
  open,
  editTarget,
  onClose,
  onSaved,
  onDeleted,
  canDelete,
}: {
  open: boolean
  editTarget: Prompt | null
  onClose: () => void
  onSaved: (p: Prompt, isNew: boolean) => void
  onDeleted?: (id: string) => void
  canDelete?: boolean
}) {
  const { mode: colorMode } = useColorMode()
  const empty = (): PromptForm => ({ name: '', description: '', content: '', tags: [] })
  const [form, setForm] = useState<PromptForm>(empty())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [expandedOpen, setExpandedOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editTarget
        ? { name: editTarget.name, description: editTarget.description ?? '', content: editTarget.content, tags: editTarget.tags ?? [] }
        : empty()
      )
      setError('')
    }
  }, [open, editTarget])

  const setField = <K extends keyof PromptForm>(k: K, v: PromptForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.content.trim()) { setError('Content is required.'); return }
    setSaving(true); setError('')
    try {
      const dto = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        content: form.content,
        tags: form.tags,
      }
      if (editTarget) {
        const { data } = await api.patch<Prompt>(`/prompts/${editTarget.id}`, dto)
        onSaved(data, false)
      } else {
        const { data } = await api.post<Prompt>('/prompts', dto)
        onSaved(data, true)
      }
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!editTarget) return
    setDeleting(true)
    try {
      await api.delete(`/prompts/${editTarget.id}`)
      onDeleted?.(editTarget.id)
      setDeleteConfirmOpen(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const monacoOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 12 },
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 640 }, display: 'flex', flexDirection: 'column' } }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>{editTarget ? `Edit — ${editTarget.name}` : 'New prompt'}</Typography>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Box>

        {/* Metadata fields */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small" fullWidth required label="Name" value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Summarize document"
          />
          <TextField
            size="small" fullWidth multiline minRows={2} maxRows={4} label="Description" value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What this prompt does…"
          />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Tags</Typography>
            <TagInput tags={form.tags} onChange={(t) => setField('tags', t)} />
          </Box>
        </Box>

        {/* Editor toolbar */}
        <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', flexShrink: 0, minHeight: 40 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.06em', flexGrow: 1 }}>
            CONTENT
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mr: 1 }}>
            Use {'{{variable}}'} for dynamic values
          </Typography>
          <Tooltip title="Expand editor">
            <IconButton size="small" onClick={() => setExpandedOpen(true)}>
              <IconArrowsMaximize size={16} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Monaco editor — fills remaining height */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language="plaintext"
            value={form.content}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            onChange={(v) => setField('content', v ?? '')}
            options={monacoOptions}
          />
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          {editTarget && canDelete && (
            <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}
              startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
              Delete prompt
            </Button>
          )}
          <Button onClick={onClose} disabled={saving || deleting}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving || deleting}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create prompt'}
          </Button>
        </Box>
      </Drawer>

      {/* Expanded Monaco — left drawer */}
      <Drawer anchor="left" open={expandedOpen} onClose={() => setExpandedOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 640px)' }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Prompt content</Typography>
          <Typography variant="caption" color="text.disabled">Use {'{{variable}}'} for dynamic values</Typography>
          <Tooltip title="Collapse">
            <IconButton size="small" onClick={() => setExpandedOpen(false)}>
              <IconArrowsMinimize size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language="plaintext"
            value={form.content}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            onChange={(v) => setField('content', v ?? '')}
            options={{ ...monacoOptions, minimap: { enabled: true }, fontSize: 14 }}
          />
        </Box>
      </Drawer>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete "${editTarget?.name}"?`}
        message="This prompt will be permanently removed."
        confirmLabel="Delete" confirmColor="error" loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Prompts() {
  const { can, loading: authLoading } = useAuth()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Prompt | null>(null)
  const [snack, setSnack] = useState<{ message: string; severity?: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!can(Permission.PromptsView)) { setLoading(false); return }
    api.get<Prompt[]>('/prompts')
      .then((r) => setPrompts(r.data))
      .catch(() => setSnack({ message: 'Failed to load prompts.', severity: 'error' }))
      .finally(() => setLoading(false))
  }, [authLoading])

  const allTags = [...new Set(prompts.flatMap((p) => p.tags))].sort()

  const visible = prompts.filter((p) => {
    if (tagFilter && !p.tags.includes(tagFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      )
    }
    return true
  })

  const openCreate = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = (p: Prompt) => { setEditTarget(p); setDialogOpen(true) }

  const handleSaved = (saved: Prompt, isNew: boolean) => {
    setPrompts((prev) =>
      isNew ? [saved, ...prev] : prev.map((p) => p.id === saved.id ? saved : p)
    )
    setSnack({ message: isNew ? 'Prompt created.' : 'Prompt updated.', severity: 'success' })
  }

  const handleCopy = async (p: Prompt) => {
    try {
      await navigator.clipboard.writeText(p.content)
      setSnack({ message: 'Copied to clipboard.', severity: 'success' })
    } catch {
      setSnack({ message: 'Could not copy.', severity: 'error' })
    }
  }

  const handleDeleted = (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
    setDialogOpen(false)
    setSnack({ message: 'Prompt deleted.', severity: 'success' })
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} mb={0.25}>Prompts</Typography>
          <Typography variant="body2" color="text.secondary">
            Save and organize your prompt templates for reuse across projects.
          </Typography>
        </Box>
        {can(Permission.PromptsCreate) && (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
            New prompt
          </Button>
        )}
      </Box>

      {/* Search + tag filter */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search prompts…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
          }}
        />
        {allTags.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
            <Chip
              label="All" size="small" clickable
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
        {(search || tagFilter) && (
          <Typography variant="body2" color="text.secondary" ml="auto">
            {visible.length} of {prompts.length}
          </Typography>
        )}
      </Box>

      {/* Content */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : prompts.length === 0 ? (
        <Alert severity="info" sx={{ maxWidth: 480 }}>
          No prompts yet. Click <strong>New prompt</strong> to create your first one.
        </Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">No prompts match your search.</Alert>
      ) : (
        <Grid container spacing={2}>
          {visible.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <PromptCard
                prompt={p}
                onEdit={openEdit}
                onCopy={handleCopy}
                canEdit={can(Permission.PromptsEdit)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <PromptDialog
        open={dialogOpen}
        editTarget={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        canDelete={can(Permission.PromptsDelete)}
      />

      <AppSnackbar
        open={snack !== null}
        message={snack?.message ?? ''}
        severity={snack?.severity ?? 'success'}
        onClose={() => setSnack(null)}
      />
    </Box>
  )
}
