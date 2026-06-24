import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
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
  IconEye,
  IconEyeOff,
  IconLock,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import api from '../api'
import { useAuth, Permission } from '../context/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import AppSnackbar from '../components/AppSnackbar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Secret {
  id: string
  name: string
  value: string
  description?: string
  createdAt: string
  updatedAt: string
}

// ─── Secret card ──────────────────────────────────────────────────────────────

function SecretCard({ secret, onEdit, onCopy }: {
  secret: Secret
  onEdit: (s: Secret) => void
  onCopy: (s: Secret) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const { can } = useAuth()

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
          borderColor: 'warning.main',
          boxShadow: '0 2px 12px rgba(255,180,0,0.12)',
          '& .card-actions': { opacity: 1 },
        },
      }}
    >
      <Box
        className="card-actions"
        sx={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.15s',
        }}
      >
        <Tooltip title="Copy value">
          <IconButton size="small" onClick={() => onCopy(secret)}
            sx={{ p: 0.5, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
            <IconCopy size={15} />
          </IconButton>
        </Tooltip>
        {can(Permission.SecretsEdit) && (
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(secret)}
              sx={{ p: 0.5, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
              <IconEdit size={15} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: '12px !important', pr: 5 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Box sx={{ color: 'warning.main', flexShrink: 0 }}><IconLock size={16} /></Box>
          <Typography fontWeight={700} fontSize="0.9375rem" noWrap lineHeight={1.3}>
            {secret.name}
          </Typography>
        </Box>

        {secret.description && (
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
            {secret.description}
          </Typography>
        )}

        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
            {revealed ? secret.value : '••••••••••••'}
          </Typography>
          {can(Permission.SecretsRevealValues) && (
            <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
              <IconButton size="small" onClick={() => setRevealed((r) => !r)} sx={{ p: 0.25 }}>
                {revealed ? <IconEyeOff size={13} /> : <IconEye size={13} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box mt={1} sx={{ bgcolor: 'action.hover', borderRadius: '4px', px: 1, py: 0.25, display: 'inline-block' }}>
          <Typography variant="caption" fontFamily="monospace" color="text.secondary" fontSize="0.68rem">
            {`{{secret:${secret.name}}}`}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          {secret.updatedAt && `Updated ${new Date(secret.updatedAt).toLocaleDateString()}`}
        </Typography>
      </CardContent>
    </Card>
  )
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface SecretForm {
  name: string
  value: string
  description: string
}

function SecretDialog({
  open,
  editTarget,
  onClose,
  onSaved,
  onDeleted,
  canDelete,
}: {
  open: boolean
  editTarget: Secret | null
  onClose: () => void
  onSaved: (s: Secret, isNew: boolean) => void
  onDeleted?: (id: string) => void
  canDelete?: boolean
}) {
  const empty = (): SecretForm => ({ name: '', value: '', description: '' })
  const [form, setForm] = useState<SecretForm>(empty())
  const [showValue, setShowValue] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editTarget
        ? { name: editTarget.name, value: editTarget.value, description: editTarget.description ?? '' }
        : empty()
      )
      setError('')
      setShowValue(false)
    }
  }, [open, editTarget])

  const setField = <K extends keyof SecretForm>(k: K, v: SecretForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.value.trim()) { setError('Value is required.'); return }
    setSaving(true); setError('')
    try {
      const dto = {
        name: form.name.trim(),
        value: form.value,
        description: form.description.trim() || undefined,
      }
      if (editTarget) {
        const { data } = await api.patch<Secret>(`/secrets/${editTarget.id}`, dto)
        onSaved(data, false)
      } else {
        const { data } = await api.post<Secret>('/secrets', dto)
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
      await api.delete(`/secrets/${editTarget.id}`)
      onDeleted?.(editTarget.id)
      setDeleteConfirmOpen(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{editTarget ? `Edit — ${editTarget.name}` : 'New secret'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            size="small" fullWidth required label="Name" value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. STRIPE_API_KEY"
            helperText="Used as {{secret:NAME}} in auth config"
            disabled={!!editTarget}
          />
          <TextField
            size="small" fullWidth required label="Value" value={form.value}
            type={showValue ? 'text' : 'password'}
            onChange={(e) => setField('value', e.target.value)}
            placeholder="Secret value…"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowValue((v) => !v)} edge="end">
                    {showValue ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            size="small" fullWidth multiline minRows={3} label="Description (optional)" value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What this secret is used for…"
          />
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        {editTarget && canDelete && (
          <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}
            startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
            Delete secret
          </Button>
        )}
        <Button onClick={onClose} disabled={saving || deleting}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSave} disabled={saving || deleting}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create secret'}
        </Button>
      </Box>
    </Drawer>

    <ConfirmDialog
      open={deleteConfirmOpen}
      title={`Delete "${editTarget?.name}"?`}
      message="This secret will be permanently removed. Auth configs using it will stop working."
      confirmLabel="Delete" confirmColor="error" loading={deleting}
      onConfirm={handleDeleteConfirm}
      onClose={() => setDeleteConfirmOpen(false)}
    />
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Secrets() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Secret | null>(null)
  const [snack, setSnack] = useState<{ message: string; severity?: 'success' | 'error' } | null>(null)
  const { can, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!can(Permission.SecretsViewNames)) { setLoading(false); return }
    api.get<Secret[]>('/secrets')
      .then((r) => setSecrets(r.data))
      .catch(() => setSnack({ message: 'Failed to load secrets.', severity: 'error' }))
      .finally(() => setLoading(false))
  }, [authLoading])

  const visible = search
    ? secrets.filter((s) => {
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
      })
    : secrets

  const openCreate = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = (s: Secret) => { setEditTarget(s); setDialogOpen(true) }

  const handleSaved = (saved: Secret, isNew: boolean) => {
    setSecrets((prev) =>
      isNew ? [saved, ...prev] : prev.map((s) => s.id === saved.id ? saved : s)
    )
    setSnack({ message: isNew ? 'Secret created.' : 'Secret updated.', severity: 'success' })
  }

  const handleCopy = async (s: Secret) => {
    try {
      await navigator.clipboard.writeText(s.value)
      setSnack({ message: 'Value copied to clipboard.', severity: 'success' })
    } catch {
      setSnack({ message: 'Could not copy.', severity: 'error' })
    }
  }

  const handleDeleted = (id: string) => {
    setSecrets((prev) => prev.filter((s) => s.id !== id))
    setDialogOpen(false)
    setSnack({ message: 'Secret deleted.', severity: 'success' })
  }

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} mb={0.25}>Secrets vault</Typography>
          <Typography variant="body2" color="text.secondary">
            Store sensitive values and reference them in auth configs with <code>{'{{secret:NAME}}'}</code>.
          </Typography>
        </Box>
        {can(Permission.SecretsCreate) && (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
            New secret
          </Button>
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <TextField
          size="small" placeholder="Search secrets…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
          }}
        />
        {search && (
          <Typography variant="body2" color="text.secondary">
            {visible.length} of {secrets.length}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      ) : secrets.length === 0 ? (
        <Alert severity="info" sx={{ maxWidth: 480 }}>
          No secrets yet. Click <strong>New secret</strong> to add one.
        </Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">No secrets match your search.</Alert>
      ) : (
        <Grid container spacing={2}>
          {visible.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <SecretCard
                secret={s}
                onEdit={openEdit}
                onCopy={handleCopy}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <SecretDialog
        open={dialogOpen}
        editTarget={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        canDelete={can(Permission.SecretsDelete)}
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
