import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer,
  IconButton, InputAdornment, Paper, Switch, TextField,
  Tooltip, Typography,
} from '@mui/material'
import {
  IconBulb, IconEdit, IconPlus, IconSearch, IconTrash, IconX,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../context/AuthContext'
import api from '../../../api'
import ConfirmDialog from '../../../components/ConfirmDialog'
import type { GlobalPrompt, McpPrompt } from '../types'
import { PromptTestPanel } from './PromptTestPanel'

export function PromptsTab({ projectId, initialPrompts, onChange, anyApiKey }: {
  projectId: string
  initialPrompts: McpPrompt[]
  onChange: (prompts: McpPrompt[]) => void
  anyApiKey?: string
}) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [refs, setRefs] = useState<McpPrompt[]>(initialPrompts)
  const [globals, setGlobals] = useState<GlobalPrompt[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadingGlobals, setLoadingGlobals] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [editPromptTarget, setEditPromptTarget] = useState<GlobalPrompt | null>(null)
  const [promptEditOpen, setPromptEditOpen] = useState(false)
  const [promptDeleteOpen, setPromptDeleteOpen] = useState(false)

  const attachedIds = new Set(refs.map((r) => r.promptId))
  const attachedPrompts = globals.filter((p) => attachedIds.has(p.id))

  useEffect(() => {
    if (!can(Permission.PromptsView)) return
    setLoadingGlobals(true)
    api.get<GlobalPrompt[]>('/prompts')
      .then((r) => setGlobals(r.data))
      .finally(() => setLoadingGlobals(false))
  }, [can])

  const openPicker = async () => {
    setPickerSearch('')
    setPickerOpen(true)
  }

  const handleAdd = async (promptId: string) => {
    setAdding(promptId)
    try {
      await api.post(`/swagger/servers/${projectId}/prompts`, { promptId })
      const updated = [...refs, { promptId }]
      setRefs(updated); onChange(updated)
    } finally {
      setAdding(null)
    }
  }

  const handleRemove = async (promptId: string) => {
    setRemoving(promptId)
    try {
      await api.delete(`/swagger/servers/${projectId}/prompts/${promptId}`)
      const updated = refs.filter((r) => r.promptId !== promptId)
      setRefs(updated); onChange(updated)
    } finally {
      setRemoving(null)
    }
  }

  const handleTogglePrompt = async (promptId: string) => {
    const ref = refs.find((r) => r.promptId === promptId)
    const newEnabled = ref?.enabled === false
    await api.patch(`/swagger/servers/${projectId}/prompts/${promptId}`, { enabled: newEnabled })
    const updated = refs.map((r) => r.promptId === promptId ? { ...r, enabled: newEnabled } : r)
    setRefs(updated); onChange(updated)
  }

  const pickerVisible = globals.filter((p) => {
    if (attachedIds.has(p.id)) return false
    if (!pickerSearch) return true
    const q = pickerSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
  })

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.25}>Prompts</Typography>
          <Typography variant="body2" color="text.secondary">
            Prompts from your library that are active in this project.
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" startIcon={<IconBulb size={16} />}
            onClick={() => navigate('/prompts')}>
            Prompt library
          </Button>
          {can(Permission.PromptsCreate) && (
            <Button size="small" variant="contained" startIcon={<IconPlus size={16} />}
              onClick={openPicker}>
              Add prompt
            </Button>
          )}
        </Box>
      </Box>

      {/* Attached list */}
      {attachedPrompts.length === 0 ? (
        <Alert severity="info">
          No prompts added yet. Click <strong>Add prompt</strong> to include prompts from your library,
          or go to <Box component="span" sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/prompts')}>Prompt library</Box> to create new ones.
        </Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {attachedPrompts.map((p) => {
            const argNames = [...new Set([...p.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
            const isRemoving = removing === p.id
            const ref = refs.find((r) => r.promptId === p.id)
            const isDisabledPrompt = ref?.enabled === false
            return (
              <Paper key={p.id} variant="outlined" sx={{ p: 2, opacity: isDisabledPrompt ? 0.6 : 1 }}>
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <Box sx={{ color: 'secondary.main', mt: 0.25, flexShrink: 0 }}>
                    <IconBulb size={18} />
                  </Box>
                  <Box flexGrow={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.25}>
                      <Typography fontWeight={700} fontSize="0.925rem">{p.name}</Typography>
                      {isDisabledPrompt && (
                        <Chip label="disabled" size="small" color="default" sx={{ fontSize: '0.68rem', height: 18 }} />
                      )}
                      {argNames.map((v) => (
                        <Chip key={v} label={`{{${v}}}`} size="small"
                          sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 17 }} />
                      ))}
                      {(p.tags ?? []).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined"
                          sx={{ fontSize: '0.66rem', height: 17 }} />
                      ))}
                    </Box>
                    {p.description && (
                      <Typography variant="body2" color="text.secondary" mb={0.75}>
                        {p.description}
                      </Typography>
                    )}
                    <Box component="pre" sx={{
                      m: 0, p: 1, bgcolor: 'action.hover', border: '1px solid',
                      borderColor: 'divider', borderRadius: '6px',
                      fontSize: '0.72rem', fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 80, overflow: 'hidden', color: 'text.secondary',
                    }}>
                      {p.content.length > 280 ? p.content.slice(0, 280) + '…' : p.content}
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                  <Tooltip title={isDisabledPrompt ? 'Enable — make this prompt available to the AI' : 'Disable — hide this prompt from the AI'}>
                    <Switch size="small" checked={!isDisabledPrompt} onChange={() => handleTogglePrompt(p.id)} />
                  </Tooltip>
                  {can(Permission.PromptsDelete) && <Tooltip title="Edit / Remove">
                    <IconButton size="small" onClick={() => { setEditPromptTarget(p); setPromptEditOpen(true) }}>
                      <IconEdit size={16} />
                    </IconButton>
                  </Tooltip>}
                  </Box>
                </Box>
              <PromptTestPanel prompt={p} projectId={projectId} anyApiKey={anyApiKey} />
              </Paper>
            )
          })}
        </Box>
      )}

      {/* Picker dialog */}
      <Drawer anchor="right" open={pickerOpen} onClose={() => setPickerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Add prompt from library</Typography>
          <IconButton size="small" onClick={() => setPickerOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <TextField
            size="small" fullWidth autoFocus placeholder="Search prompts…"
            value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
          />
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loadingGlobals ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : globals.length === 0 ? (
            <Box p={3}>
              <Alert severity="info">
                No prompts in your library yet.{' '}
                <Box component="span" sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => { setPickerOpen(false); navigate('/prompts') }}>
                  Create one now
                </Box>
              </Alert>
            </Box>
          ) : pickerVisible.length === 0 ? (
            <Box p={3}>
              <Alert severity="info">
                {pickerSearch ? 'No prompts match your search.' : 'All prompts are already added to this server.'}
              </Alert>
            </Box>
          ) : (
            pickerVisible.map((p) => {
              const isAdding = adding === p.id
              const argNames = [...new Set([...p.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
              return (
                <Box key={p.id} sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5,
                  px: 2.5, py: 1.75,
                  borderBottom: 1, borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background 0.12s',
                }}>
                  <Box sx={{ color: 'secondary.main', mt: 0.25, flexShrink: 0 }}>
                    <IconBulb size={16} />
                  </Box>
                  <Box flexGrow={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap" mb={0.25}>
                      <Typography fontWeight={600} fontSize="0.875rem">{p.name}</Typography>
                      {argNames.length > 0 && (
                        <Chip label={`${argNames.length} var${argNames.length !== 1 ? 's' : ''}`}
                          size="small" sx={{ fontSize: '0.65rem', height: 16 }} />
                      )}
                    </Box>
                    {p.description && (
                      <Typography variant="caption" color="text.secondary">{p.description}</Typography>
                    )}
                  </Box>
                  <Button size="small" variant="contained" disabled={isAdding}
                    startIcon={isAdding ? <CircularProgress size={12} color="inherit" /> : <IconPlus size={14} />}
                    onClick={() => handleAdd(p.id)}
                    sx={{ flexShrink: 0 }}>
                    Add
                  </Button>
                </Box>
              )
            })
          )}
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button onClick={() => setPickerOpen(false)}>Done</Button>
        </Box>
      </Drawer>

      {/* Prompt detail / remove drawer */}
      <Drawer anchor="right" open={promptEditOpen} onClose={() => setPromptEditOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 520 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>
            {editPromptTarget ? `Prompt — ${editPromptTarget.name}` : 'Prompt'}
          </Typography>
          <IconButton size="small" onClick={() => setPromptEditOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {editPromptTarget && (
            <>
              {editPromptTarget.description && (
                <Typography variant="body2" color="text.secondary">{editPromptTarget.description}</Typography>
              )}
              {(editPromptTarget.tags ?? []).length > 0 && (
                <Box display="flex" gap={0.75} flexWrap="wrap">
                  {editPromptTarget.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                  ))}
                </Box>
              )}
              {(() => {
                const args = [...new Set([...editPromptTarget.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
                return args.length > 0 ? (
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>ARGUMENTS</Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {args.map((v) => (
                        <Chip key={v} label={`{{${v}}}`} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 17 }} />
                      ))}
                    </Box>
                  </Box>
                ) : null
              })()}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>CONTENT</Typography>
                <Box component="pre" sx={{
                  m: 0, p: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
                  borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', maxHeight: 320, overflow: 'auto',
                }}>
                  {editPromptTarget.content}
                </Box>
              </Box>
              <Typography variant="caption" color="text.disabled" display="block">
                To edit the prompt content, go to the{' '}
                <Box component="span" sx={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/prompts')}>
                  Prompt library
                </Box>.
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          {editPromptTarget && can(Permission.PromptsDelete) && (
            <Button color="error" onClick={() => setPromptDeleteOpen(true)} disabled={removing === editPromptTarget.id}
              startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
              Remove from server
            </Button>
          )}
          <Button onClick={() => setPromptEditOpen(false)}>Close</Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={promptDeleteOpen}
        title="Remove prompt?"
        message={`"${editPromptTarget?.name}" will be removed from this server. The prompt will remain in your library.`}
        confirmLabel="Remove" confirmColor="error" loading={removing === editPromptTarget?.id}
        onConfirm={async () => {
          if (!editPromptTarget) return
          await handleRemove(editPromptTarget.id)
          setPromptDeleteOpen(false)
          setPromptEditOpen(false)
        }}
        onClose={() => setPromptDeleteOpen(false)}
      />
    </Box>
  )
}
