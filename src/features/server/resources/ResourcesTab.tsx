import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer,
  IconButton, Paper, Switch, Tab, Tabs, TextField,
  Tooltip, Typography,
} from '@mui/material'
import {
  IconArrowsMaximize, IconArrowsMinimize, IconDatabase,
  IconEdit, IconPlus, IconTrash, IconX,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import { useColorMode } from '../../../theme/ColorModeContext'
import { useAuth, Permission } from '../../../context/AuthContext'
import api from '../../../api'
import ConfirmDialog from '../../../components/ConfirmDialog'
import type { GeneratedTool, McpResource } from '../types'
import { DynamicResourceDialog } from './DynamicResourceDialog'
import { ResourceTestPanel } from './ResourceTestPanel'
import { FromEndpointPickerDialog } from '../api-endpoints/FromEndpointPickerDialog'

export function ResourcesTab({ projectId, initialResources, tools, onChange, anyApiKey }: {
  projectId: string
  initialResources: McpResource[]
  tools: GeneratedTool[]
  onChange: (resources: McpResource[]) => void
  anyApiKey?: string
}) {
  const [resources, setResources] = useState<McpResource[]>(initialResources)
  const [dynDialogOpen, setDynDialogOpen] = useState(false)
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false)
  const [prefillResourceTool, setPrefillResourceTool] = useState<GeneratedTool | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<McpResource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<McpResource | null>(null)
  const [resourceDeleteOpen, setResourceDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [contentTab, setContentTab] = useState(0)
  const [expandedOpen, setExpandedOpen] = useState(false)
  const { mode: colorMode } = useColorMode()
  const { can } = useAuth()

  const emptyForm = () => ({ name: '', uri: '', description: '', mimeType: 'text/html', content: '' })
  const [form, setForm] = useState(emptyForm())

  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (r: McpResource) => {
    setEditTarget(r)
    setForm({ name: r.name, uri: r.uri, description: r.description ?? '', mimeType: r.mimeType ?? 'text/html', content: r.content })
    setFormError('')
    setDialogOpen(true)
  }

  const handleNameChange = (name: string) => {
    const uri = editTarget ? form.uri : `resource://${projectId}/${slugify(name)}`
    setForm((f) => ({ ...f, name, uri }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!form.uri.trim()) { setFormError('URI is required.'); return }
    if (!form.content.trim()) { setFormError('Content is required.'); return }
    setSaving(true); setFormError('')
    try {
      const dto = { name: form.name.trim(), uri: form.uri.trim(), description: form.description.trim() || undefined, mimeType: form.mimeType.trim() || undefined, content: form.content }
      if (editTarget) {
        await api.put(`/swagger/servers/${projectId}/resources/${editTarget.id}`, dto)
        const updated = resources.map((r) => r.id === editTarget.id ? { ...r, ...dto } : r)
        setResources(updated); onChange(updated)
      } else {
        const { data } = await api.post<McpResource>(`/swagger/servers/${projectId}/resources`, dto)
        const updated = [...resources, data]
        setResources(updated); onChange(updated)
      }
      setDialogOpen(false)
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to save.')
    } finally { setSaving(false) }
  }

  const handleToggleResource = async (r: McpResource) => {
    const newEnabled = r.enabled === false
    await api.patch(`/swagger/servers/${projectId}/resources/${r.id}`, { enabled: newEnabled })
    const updated = resources.map((res) => res.id === r.id ? { ...res, enabled: newEnabled } : res)
    setResources(updated); onChange(updated)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/resources/${deleteTarget.id}`)
      const updated = resources.filter((r) => r.id !== deleteTarget.id)
      setResources(updated); onChange(updated)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
      setResourceDeleteOpen(false)
      setDialogOpen(false)
    }
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={700}>Resources</Typography>
          <Typography variant="body2" color="text.secondary">
            Content exposed to the AI via the MCP protocol (static or dynamic from API)
          </Typography>
        </Box>
        {can(Permission.ResourcesCreate) && (
          <Button variant="contained" size="small" startIcon={<IconPlus size={18} />} onClick={() => setResourcePickerOpen(true)}>
            New resource
          </Button>
        )}
      </Box>

      {resources.length === 0 ? (
        <Alert severity="info">No resources yet. Click "New resource" to create a static resource or pick an endpoint to generate a dynamic one.</Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {resources.map((r) => {
            const isDisabledResource = r.enabled === false
            return (
              <Paper key={r.id} variant="outlined" sx={{ p: 2, opacity: isDisabledResource ? 0.6 : 1 }}>
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>
                    <IconDatabase size={18} />
                  </Box>
                  <Box flexGrow={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.25}>
                      <Typography fontWeight={700} fontSize="0.925rem">{r.name}</Typography>
                      {isDisabledResource && (
                        <Chip label="disabled" size="small" color="default" sx={{ fontSize: '0.68rem', height: 18 }} />
                      )}
                      {r.type === 'dynamic' && (
                        <Chip label="Dynamic" size="small" color="warning" sx={{ fontSize: '0.68rem', height: 18 }} />
                      )}
                      {r.mimeType && (
                        <Chip label={r.mimeType} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                      )}
                    </Box>
                    <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {r.uri}
                    </Typography>
                    {r.description && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>{r.description}</Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                      {r.content.length} chars · {r.content.split('\n').length} lines
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                    {can(Permission.ResourcesEdit) && (
                      <Tooltip title={isDisabledResource ? 'Enable — make this resource available to the AI' : 'Disable — hide this resource from the AI'}>
                        <Switch size="small" checked={!isDisabledResource} onChange={() => handleToggleResource(r)} />
                      </Tooltip>
                    )}
                    {can(Permission.ResourcesEdit) && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(r)}><IconEdit size={16} /></IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <ResourceTestPanel resource={r} projectId={projectId} anyApiKey={anyApiKey} />
              </Paper>
            )
          })}
        </Box>
      )}

      {/* Add / Edit dialog */}
      <Drawer anchor="right" open={dialogOpen} onClose={() => setDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 760 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>{editTarget ? `Edit resource — ${editTarget.name}` : 'New resource'}</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        {/* Metadata fields */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField size="small" fullWidth label="Name" required value={form.name}
            onChange={(e) => handleNameChange(e.target.value)} />
          <TextField size="small" fullWidth label="URI" required value={form.uri}
            onChange={(e) => setForm((f) => ({ ...f, uri: e.target.value }))}
            helperText="Unique identifier used by the MCP client to read this resource"
            InputProps={{ sx: { fontFamily: 'monospace' } }} />
          <Box display="flex" gap={2}>
            <TextField size="small" fullWidth multiline minRows={2} maxRows={4} label="Description" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <TextField size="small" label="MIME Type" value={form.mimeType}
              onChange={(e) => setForm((f) => ({ ...f, mimeType: e.target.value }))}
              placeholder="text/html" sx={{ width: 160, flexShrink: 0 }} />
          </Box>
        </Box>

        {/* Code / Preview tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, flexShrink: 0 }}>
          <Tabs value={contentTab} onChange={(_, v) => setContentTab(v)} sx={{ minHeight: 40 }}
            TabIndicatorProps={{ sx: { height: 2 } }}>
            <Tab label="Code" sx={{ minHeight: 40, fontSize: '0.8rem', py: 0.5 }} />
            <Tab label="Preview" sx={{ minHeight: 40, fontSize: '0.8rem', py: 0.5 }} />
          </Tabs>
          <Box flexGrow={1} />
          <Tooltip title="Expand editor">
            <IconButton size="small" onClick={() => setExpandedOpen(true)} sx={{ mr: 0.5 }}>
              <IconArrowsMaximize size={16} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Editor area — flex:1 so it fills remaining drawer height */}
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {contentTab === 0 ? (
            <MonacoEditor
              height="100%"
              language={form.mimeType?.includes('html') ? 'html' : form.mimeType?.includes('json') ? 'json' : 'html'}
              value={form.content}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(v) => setForm((f) => ({ ...f, content: v ?? '' }))}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <iframe
                srcDoc={form.content || '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet — write HTML in the Code tab.</p>'}
                sandbox="allow-same-origin"
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                title="Resource preview"
              />
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          {editTarget && can(Permission.ResourcesDelete) && (
            <Button color="error" onClick={() => { setDeleteTarget(editTarget); setResourceDeleteOpen(true) }} disabled={saving || deleting}
              startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
              Delete resource
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)} disabled={saving || deleting}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || deleting}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create resource'}
          </Button>
        </Box>
      </Drawer>

      {/* Expanded Monaco editor — left drawer */}
      <Drawer anchor="left" open={expandedOpen} onClose={() => setExpandedOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 760px)' }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>HTML template</Typography>
          <Tabs value={contentTab} onChange={(_, v) => setContentTab(v)} sx={{ minHeight: 36 }}
            TabIndicatorProps={{ sx: { height: 2 } }}>
            <Tab label="Code" sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
            <Tab label="Preview" sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
          </Tabs>
          <Box flexGrow={1} />
          <Tooltip title="Collapse">
            <IconButton size="small" onClick={() => setExpandedOpen(false)}>
              <IconArrowsMinimize size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {contentTab === 0 ? (
            <MonacoEditor
              height="100%"
              language={form.mimeType?.includes('html') ? 'html' : form.mimeType?.includes('json') ? 'json' : 'html'}
              value={form.content}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(v) => setForm((f) => ({ ...f, content: v ?? '' }))}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 16 },
              }}
            />
          ) : (
            <iframe
              srcDoc={form.content || '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet — write HTML in the Code tab.</p>'}
              sandbox="allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              title="Resource preview expanded"
            />
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={resourceDeleteOpen}
        title="Delete resource?"
        message={`"${deleteTarget?.name}" will be permanently removed from this server.`}
        confirmLabel="Delete" confirmColor="error" loading={deleting}
        onConfirm={handleDelete}
        onClose={() => { setResourceDeleteOpen(false); setDeleteTarget(null) }}
      />

      <DynamicResourceDialog
        open={dynDialogOpen}
        projectId={projectId}
        tools={tools}
        prefillTool={prefillResourceTool}
        onSave={(r) => {
          const updated = [...resources, r]
          setResources(updated); onChange(updated)
          setDynDialogOpen(false)
          setPrefillResourceTool(undefined)
        }}
        onClose={() => { setDynDialogOpen(false); setPrefillResourceTool(undefined) }}
      />

      <FromEndpointPickerDialog
        open={resourcePickerOpen}
        tools={tools.filter((t) => !!t.endpointRef)}
        title="Create resource from endpoint"
        description="Select an endpoint to create a dynamic resource. The API response will be rendered through an HTML template using Handlebars.js."
        onPick={(tool) => {
          setResourcePickerOpen(false)
          setPrefillResourceTool(tool)
          setDynDialogOpen(true)
        }}
        onBlank={() => { setResourcePickerOpen(false); openAdd() }}
        onClose={() => setResourcePickerOpen(false)}
      />
    </Box>
  )
}
