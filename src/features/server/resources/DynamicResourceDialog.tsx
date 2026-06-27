import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Drawer,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
  Paper, Select, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconArrowsMaximize, IconArrowsMinimize, IconCopy, IconExternalLink,
  IconLink, IconPlayerPlay, IconX,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import Handlebars from 'handlebars'
import { Tabs, Tab } from '@mui/material'
import api from '../../../api'
import { useColorMode } from '../../../theme/ColorModeContext'
import type { GeneratedTool, HbArray, HbScalar, JsonSchema, McpResource } from '../types'
import { METHOD_COLOR } from '../constants'

export function FieldInput({ name, schema, value, required, onChange }: {
  name: string; schema: JsonSchema; value: string; required: boolean; onChange: (v: string) => void
}) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum?.length) {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} label={label} onChange={(e) => onChange(String(e.target.value))}>
          {schema.enum.map((v) => <MenuItem key={String(v)} value={String(v)}>{String(v)}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }
  if (schema.type === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} size="small" />}
        label={<Typography variant="body2">{label}</Typography>}
      />
    )
  }
  const isJson = schema.type === 'object' || schema.type === 'array'
  return (
    <TextField size="small" fullWidth label={label} value={value} onChange={(e) => onChange(e.target.value)}
      helperText={schema.description} type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
      multiline={isJson} minRows={isJson ? 6 : 1} maxRows={isJson ? 16 : 4}
      InputProps={isJson ? { sx: { fontFamily: 'monospace', fontSize: '0.82rem' } } : undefined}
      placeholder={schema.type === 'object' ? '{"key":"value"}' : schema.type === 'array' ? '["item1"]' : undefined} />
  )
}

export function extractHbSchema(root: unknown, prefix = '', depth = 0): { scalars: HbScalar[]; arrays: HbArray[] } {
  const scalars: HbScalar[] = []
  const arrays: HbArray[] = []
  if (root == null || typeof root !== 'object' || Array.isArray(root) || depth > 3) return { scalars, arrays }
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (Array.isArray(v)) {
      const itemScalars: string[] = []
      if (v.length > 0 && v[0] != null && typeof v[0] === 'object') {
        extractHbSchema(v[0], '', 0).scalars.forEach((s) => itemScalars.push(s.path))
      }
      arrays.push({ path, length: v.length, itemScalars })
    } else if (v !== null && typeof v === 'object') {
      const nested = extractHbSchema(v, path, depth + 1)
      scalars.push(...nested.scalars)
      arrays.push(...nested.arrays)
    } else {
      scalars.push({ path, sample: v == null ? '' : String(v).slice(0, 120) })
    }
  }
  return { scalars, arrays }
}

export function DynamicResourceDialog({
  open, projectId, tools, onSave, onClose, prefillTool,
}: {
  open: boolean
  projectId: string
  tools: GeneratedTool[]
  onSave: (resource: McpResource) => void
  onClose: () => void
  prefillTool?: GeneratedTool
}) {
  const [selectedTool, setSelectedTool] = useState<GeneratedTool | null>(null)
  const [args, setArgs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null)
  const [parsedBody, setParsedBody] = useState<unknown>(null)
  const [testError, setTestError] = useState('')
  const [schemaApplied, setSchemaApplied] = useState(false)
  const [scalars, setScalars] = useState<HbScalar[]>([])
  const [arrays, setArrays] = useState<HbArray[]>([])
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [uri, setUri] = useState('')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('Error loading resource: {{error}}')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [templateTab, setTemplateTab] = useState(0)
  const [templateExpanded, setTemplateExpanded] = useState(false)
  const { mode: colorMode } = useColorMode()

  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  useEffect(() => {
    if (open && prefillTool) {
      setSelectedTool(prefillTool)
      setArgs({})
      setTestResult(null); setParsedBody(null); setTestError('')
      setSchemaApplied(false); setScalars([]); setArrays([])
    }
  }, [open, prefillTool])

  const reset = () => {
    setSelectedTool(null); setArgs({}); setTesting(false)
    setTestResult(null); setParsedBody(null); setTestError('')
    setSchemaApplied(false); setScalars([]); setArrays([])
    setContent('')
    setName(''); setUri(''); setDescription('')
    setErrorMessage('Error loading resource: {{error}}')
    setSaving(false); setFormError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleToolSelect = (toolName: string) => {
    const t = tools.find((t) => t.name === toolName) ?? null
    setSelectedTool(t); setArgs({})
    setTestResult(null); setParsedBody(null); setTestError('')
    setSchemaApplied(false); setScalars([]); setArrays([])
  }

  const handleTest = async () => {
    if (!selectedTool?.endpointRef) return
    setTesting(true); setTestError('')
    setSchemaApplied(false); setScalars([]); setArrays([])
    try {
      const builtArgs: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(args)) { if (v !== '') builtArgs[k] = v }
      const { data } = await api.post(`/swagger/servers/${projectId}/test-endpoint`, {
        endpointRef: selectedTool.endpointRef,
        args: builtArgs,
      })
      setTestResult(data)
      try { setParsedBody(JSON.parse(data.body)) } catch { setParsedBody(null) }
    } catch (err: any) {
      setTestError(err?.response?.data?.message ?? 'Request failed')
      setTestResult(null); setParsedBody(null)
    } finally { setTesting(false) }
  }

  const handleUseSchema = () => {
    if (parsedBody == null) return
    // If root is array, wrap it so Handlebars context is { items: [...] }
    const root = Array.isArray(parsedBody) ? { items: parsedBody } : parsedBody
    const { scalars: s, arrays: a } = extractHbSchema(root)
    setScalars(s); setArrays(a); setSchemaApplied(true)
  }

  const handleNameChange = (n: string) => {
    setName(n); setUri(`resource://${projectId}/${slugify(n)}`)
  }

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Name is required.'); return }
    if (!uri.trim()) { setFormError('URI is required.'); return }
    if (!content.trim()) { setFormError('Template content is required.'); return }
    if (!selectedTool?.endpointRef) { setFormError('Select an endpoint first.'); return }
    const inputDefaults: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(args)) { if (v !== '') inputDefaults[k] = v }
    setSaving(true); setFormError('')
    try {
      const dto: Omit<McpResource, 'id'> = {
        name: name.trim(), uri: uri.trim(),
        description: description.trim() || undefined,
        mimeType: 'text/html', content,
        type: 'dynamic',
        endpointRef: selectedTool.endpointRef,
        endpointSource: selectedTool.name,
        inputDefaults,
        errorConfig: errorMessage.trim() ? { message: errorMessage.trim() } : undefined,
      }
      const { data } = await api.post<McpResource>(`/swagger/servers/${projectId}/resources`, dto)
      onSave(data); reset()
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to save.')
    } finally { setSaving(false) }
  }

  const rawPreview = useMemo(() => {
    try { return testResult ? JSON.stringify(JSON.parse(testResult.body), null, 2) : null }
    catch { return testResult?.body ?? null }
  }, [testResult])

  const livePreview = useMemo(() => {
    if (!content || parsedBody == null) return null
    try {
      const ctx = Array.isArray(parsedBody) ? { items: parsedBody } : parsedBody
      return Handlebars.compile(content)(ctx)
    } catch (e: any) {
      return `<!-- Template error: ${e?.message} -->`
    }
  }, [content, parsedBody])

  const copyBlock = (arr: HbArray) => {
    const inner = arr.itemScalars.length > 0
      ? arr.itemScalars.map((f) => `  {{${f}}}`).join('\n')
      : '  {{this}}'
    navigator.clipboard?.writeText(`{{#each ${arr.path}}}\n${inner}\n{{/each}}`)
  }

  const scalarPaths = scalars.map((s) => s.path)

  return (
    <>
    <Drawer anchor="right" open={open} onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 760 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>New dynamic resource</Typography>
        <IconButton size="small" onClick={handleClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        <Box display="flex" flexDirection="column" gap={3}>

          {/* Section 1 — Endpoint & parameters */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>1. Endpoint</Typography>
              {prefillTool && (
                <Chip size="small" icon={<IconLink size={12} />} label={`Linked to: ${prefillTool.name}`}
                  color="primary" variant="outlined" sx={{ fontSize: '0.72rem', height: 22 }} />
              )}
            </Box>
            {prefillTool ? (
              /* Read-only endpoint card when coming from the picker */
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1.5, borderRadius: 1.5 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    px: 1, py: 0.3, borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700,
                    fontSize: '0.72rem', minWidth: 52, textAlign: 'center', flexShrink: 0,
                    bgcolor: METHOD_COLOR[prefillTool.endpointRef?.method?.toUpperCase() ?? ''] ?? '#888',
                    color: '#fff',
                  }}>
                    {prefillTool.endpointRef?.method?.toUpperCase() ?? '?'}
                  </Box>
                  <Typography fontFamily="monospace" fontSize="0.84rem" fontWeight={600} flexGrow={1} minWidth={0} noWrap>
                    {prefillTool.endpointRef?.path ?? '/'}
                  </Typography>
                  <Chip size="small" label={prefillTool.name}
                    sx={{ fontFamily: 'monospace', fontSize: '0.68rem', height: 20, bgcolor: 'action.hover', flexShrink: 0 }} />
                </Box>
                {prefillTool.description && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                    {prefillTool.description}
                  </Typography>
                )}
              </Paper>
            ) : (
              <>
                <FormControl fullWidth size="small" sx={{ mb: selectedTool ? 1 : 1.5 }}>
                  <InputLabel>Select endpoint</InputLabel>
                  <Select label="Select endpoint" value={selectedTool?.name ?? ''} onChange={(e) => handleToolSelect(e.target.value)}>
                    {tools.filter((t) => !!t.endpointRef).map((t) => (
                      <MenuItem key={t.name} value={t.name}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={t.endpointRef.method.toUpperCase()} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                          <Typography variant="body2" fontFamily="monospace">{t.endpointRef.path}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedTool && (
                  <Paper variant="outlined" sx={{ px: 2, py: 1.25, mb: 1.5, borderRadius: 1.5 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{
                        px: 1, py: 0.3, borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700,
                        fontSize: '0.72rem', minWidth: 52, textAlign: 'center', flexShrink: 0,
                        bgcolor: METHOD_COLOR[selectedTool.endpointRef.method.toUpperCase()] ?? '#888',
                        color: '#fff',
                      }}>
                        {selectedTool.endpointRef.method.toUpperCase()}
                      </Box>
                      <Typography fontFamily="monospace" fontSize="0.84rem" fontWeight={600} flexGrow={1} minWidth={0} noWrap>
                        {selectedTool.endpointRef.path}
                      </Typography>
                      <Chip size="small" label={selectedTool.name}
                        sx={{ fontFamily: 'monospace', fontSize: '0.68rem', height: 20, bgcolor: 'action.hover', flexShrink: 0 }} />
                    </Box>
                    {selectedTool.description && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                        {selectedTool.description}
                      </Typography>
                    )}
                  </Paper>
                )}
              </>
            )}
            {selectedTool && selectedTool.endpointRef.parameterMap.length > 0 && (
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Fixed parameter values</Typography>
                {selectedTool.endpointRef.parameterMap.map((p) => (
                  <TextField key={p.toolParamName} size="small" fullWidth
                    label={p.toolParamName}
                    helperText={`source: ${p.source}${p.required ? ' · required' : ''}`}
                    value={args[p.toolParamName] ?? ''}
                    onChange={(e) => setArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                ))}
              </Box>
            )}
          </Box>

          <Divider />

          {/* Section 2 — Test & schema */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>2. Test & map response</Typography>
            <Box display="flex" gap={1} mb={1.5}>
              <Button size="small" variant="outlined" onClick={handleTest} disabled={!selectedTool || testing}
                startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}>
                {testing ? 'Running…' : 'Test endpoint'}
              </Button>
              {testResult && parsedBody != null && (
                <Button size="small" variant="outlined" color="success" onClick={handleUseSchema}>
                  {schemaApplied ? 'Refresh schema' : 'Use response schema'}
                </Button>
              )}
            </Box>

            {testError && <Alert severity="error" sx={{ mb: 1 }}>{testError}</Alert>}

            {testResult && (
              <Box mb={schemaApplied ? 1.5 : 0}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  HTTP {testResult.status}
                </Typography>
                <Box component="pre" sx={{
                  bgcolor: 'action.hover', borderRadius: 1, p: 1.5, overflow: 'auto',
                  maxHeight: 180, fontSize: '0.75rem', fontFamily: 'monospace', m: 0,
                }}>
                  {rawPreview?.slice(0, 3000)}
                  {(rawPreview?.length ?? 0) > 3000 && '\n… (truncated)'}
                </Box>
              </Box>
            )}

            {schemaApplied && (
              <Box display="flex" flexDirection="column" gap={2}>

                {/* Scalar variables */}
                {scalars.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                      Scalar variables
                    </Typography>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ py: 0.5, fontWeight: 700, fontSize: '0.72rem', width: '42%' }}>Variable</TableCell>
                            <TableCell sx={{ py: 0.5, fontWeight: 700, fontSize: '0.72rem' }}>Sample value</TableCell>
                            <TableCell sx={{ py: 0.5, width: 36 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {scalars.map((s) => (
                            <TableRow key={s.path} hover>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main">
                                  {`{{${s.path}}}`}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace"
                                  sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                                  {s.sample !== '' ? s.sample : <em style={{ opacity: 0.5 }}>(empty)</em>}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Tooltip title="Copy">
                                  <IconButton size="small" onClick={() => navigator.clipboard?.writeText(`{{${s.path}}}`)}>
                                    <IconCopy size={13} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>
                )}

                {/* Array variables — Handlebars each blocks */}
                {arrays.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                      Array variables — use <code style={{ fontFamily: 'monospace' }}>{'{{#each}}'}</code> to iterate
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {arrays.map((a) => {
                        const inner = a.itemScalars.length > 0
                          ? a.itemScalars.map((f) => `  {{${f}}}`).join('\n')
                          : '  {{this}}'
                        const block = `{{#each ${a.path}}}\n${inner}\n{{/each}}`
                        return (
                          <Paper key={a.path} variant="outlined" sx={{ p: 1.25 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                              <Box flexGrow={1} minWidth={0}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main" fontWeight={700}>
                                    {`{{#each ${a.path}}}`}
                                  </Typography>
                                  <Chip label={`${a.length} item${a.length !== 1 ? 's' : ''}`} size="small"
                                    sx={{ fontSize: '0.65rem', height: 18 }} />
                                </Box>
                                <Box component="pre" sx={{
                                  m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 0.75,
                                  fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto',
                                  lineHeight: 1.5,
                                }}>
                                  {block}
                                </Box>
                                {a.itemScalars.length > 0 && (
                                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                                    <Typography variant="caption" color="text.secondary" alignSelf="center">Fields inside block:</Typography>
                                    {a.itemScalars.map((f) => (
                                      <Chip key={f} label={`{{${f}}}`} size="small" variant="outlined"
                                        onClick={() => navigator.clipboard?.writeText(`{{${f}}}`)}
                                        sx={{ fontSize: '0.67rem', height: 18, fontFamily: 'monospace', cursor: 'pointer' }} />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Tooltip title="Copy block">
                                <IconButton size="small" onClick={() => copyBlock(a)} sx={{ flexShrink: 0, mt: 0.25 }}>
                                  <IconCopy size={14} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Paper>
                        )
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Divider />

          {/* Section 3 — Template */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>3. HTML template</Typography>
              <Tooltip title="Open Handlebars.js documentation — template syntax reference (expressions, #each, helpers)">
                <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html" target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                  <IconExternalLink size={13} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Write HTML using <strong>Handlebars.js</strong> syntax, use <code>{'{{variable}}'}</code> to insert data fields and <code>{'{{#each items}}'}</code> to iterate over arrays. The icon <IconExternalLink size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} /> opens the official Handlebars.js docs.
            </Typography>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', mb: 0 }}>
              <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }}
                TabIndicatorProps={{ sx: { height: 2 } }}>
                <Tab label="Code" sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
                <Tab label="Preview" sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
              </Tabs>
              <Box flexGrow={1} />
              <Tooltip title="Expand editor">
                <IconButton size="small" onClick={() => setTemplateExpanded(true)} sx={{ mr: 0.5 }}>
                  <IconArrowsMaximize size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ height: 360, border: 1, borderColor: 'divider', borderTop: 0, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {templateTab === 0 ? (
                <MonacoEditor
                  height="100%"
                  language="html"
                  value={content}
                  theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
                  onChange={(v) => setContent(v ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    automaticLayout: true,
                    padding: { top: 8 },
                  }}
                />
              ) : (
                <iframe
                  srcDoc={livePreview ?? content ?? '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet — write HTML in the Code tab.</p>'}
                  sandbox="allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title="Template preview"
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Section 4 — Metadata & error */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>4. Metadata & error</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField size="small" fullWidth label="Name" required value={name}
                onChange={(e) => handleNameChange(e.target.value)} />
              <TextField size="small" fullWidth label="URI" required value={uri}
                onChange={(e) => setUri(e.target.value)}
                helperText="Auto-generated from name"
                InputProps={{ sx: { fontFamily: 'monospace' } }} />
              <TextField size="small" fullWidth multiline minRows={3} label="Description" value={description}
                onChange={(e) => setDescription(e.target.value)} />
              <TextField size="small" fullWidth label="Error message" value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                helperText='Shown to the MCP client if the API call fails. Use {{error}} to include the original error.' />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : 'Create resource'}
        </Button>
      </Box>

    </Drawer>

    {/* Expanded Monaco — left drawer */}
    <Drawer anchor="left" open={templateExpanded} onClose={() => setTemplateExpanded(false)}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 760px)' }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
          <Typography variant="h6" fontWeight={700}>HTML template</Typography>
          <Tooltip title="Handlebars.js template syntax documentation">
            <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html" target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
              <IconExternalLink size={14} />
            </IconButton>
          </Tooltip>
        </Box>
        <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }}
          TabIndicatorProps={{ sx: { height: 2 } }}>
          <Tab label="Code" sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
          <Tab label="Preview" sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
        </Tabs>
        <Box flexGrow={1} />
        <Tooltip title="Collapse">
          <IconButton size="small" onClick={() => setTemplateExpanded(false)}>
            <IconArrowsMinimize size={16} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {templateTab === 0 ? (
          <MonacoEditor
            height="100%"
            language="html"
            value={content}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            onChange={(v) => setContent(v ?? '')}
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
            srcDoc={livePreview ?? content ?? '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet.</p>'}
            sandbox="allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            title="Template preview expanded"
          />
        )}
      </Box>
    </Drawer>
    </>
  )
}
