import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Drawer,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, Switch, Tab, Tabs, TextField,
  Tooltip, Typography,
} from '@mui/material'
import {
  IconArrowsMaximize, IconArrowsMinimize, IconExternalLink,
  IconPlus, IconTrash, IconX, IconPlayerPlay,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import Handlebars from 'handlebars'
import { useColorMode } from '../../../../theme'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { ConfirmDialog } from '../../../../components'
import type {
  GeneratedTool, HbArray, HbScalar, JsonSchema,
  ParameterMapping, ParamEntry, HeaderEntry, Project, ToolDialogProps,
} from '../../types'
import { METHOD_COLOR, METHODS, SOURCES, PARAM_TYPES, SOURCE_CHIP_COLOR } from '../../constants'
import { inferSchema } from '../utils'
import { extractHbSchema } from '../../resources/DynamicResourceDialog'
import { emptyParam, emptyHeader, toolToFormState } from '../utils'

export function ToolDialog({ open, onClose, onSaved, onDeleted, projectId, projectBaseUrl, editTool, prefillFrom, mode = 'tool', allTools }: ToolDialogProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const isEdit = !!editTool
  const isEndpoint = mode === 'endpoint'
  const entityLabel = isEndpoint ? t('common:terms.endpoint') : t('common:terms.tool')
  // All tools are created from endpoints — Section 1 is always read-only in tool mode
  // linkedSourceName shows the source endpoint name when available
  const linkedSourceName = !isEndpoint
    ? (!isEdit ? prefillFrom?.name : editTool?.endpointSource)
    : undefined
  // outputSchema of the source endpoint (for showing available template variables in Section 3)
  const endpointOutputSchema = useMemo<JsonSchema | undefined>(() => {
    if (isEndpoint) return undefined
    if (!isEdit && prefillFrom?.outputSchema) return prefillFrom.outputSchema
    if (isEdit && editTool?.endpointSource && allTools) {
      return allTools.find((t) => t.name === editTool.endpointSource)?.outputSchema
    }
    return undefined
  }, [isEndpoint, isEdit, prefillFrom, editTool, allTools])
  const { mode: colorMode } = useColorMode()

  const buildInitialForm = () => {
    if (editTool) return toolToFormState(editTool)
    if (prefillFrom) return { ...toolToFormState(prefillFrom), name: '', description: '' }
    return toolToFormState(undefined)
  }

  const [form, setForm] = useState(buildInitialForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Test & schema state (tool mode)
  const [testArgs, setTestArgs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null)
  const [parsedBody, setParsedBody] = useState<unknown>(null)
  const [testError, setTestError] = useState('')
  const [scalars, setScalars] = useState<HbScalar[]>([])
  const [arrays, setArrays] = useState<HbArray[]>([])
  const [schemaApplied, setSchemaApplied] = useState(false)
  const [capturedSchema, setCapturedSchema] = useState<JsonSchema | null>(null)
  const [savingSchema, setSavingSchema] = useState(false)
  const [errorMessage, setErrorMessage] = useState(t('error.toolCallFailedTemplate'))
  const [templateTab, setTemplateTab] = useState(0)
  const [templateExpanded, setTemplateExpanded] = useState(false)

  const { can } = useAuth()

  useEffect(() => {
    if (open) {
      setForm(editTool ? toolToFormState(editTool) : prefillFrom ? { ...toolToFormState(prefillFrom), name: '', description: '' } : toolToFormState(undefined))
      setError(''); setDeleting(false)
      setCapturedSchema(null); setSavingSchema(false)
      setErrorMessage(editTool?.errorConfig?.message ?? t('error.toolCallFailedTemplate'))
      setTestArgs({}); setTesting(false); setTestResult(null); setParsedBody(null)
      setTestError(''); setScalars([]); setArrays([]); setSchemaApplied(false)
      setTemplateTab(0); setTemplateExpanded(false)
    }
  }, [open, editTool, prefillFrom])

  const rawPreview = useMemo(() => {
    try { return testResult ? JSON.stringify(JSON.parse(testResult.body), null, 2) : null }
    catch { return testResult?.body ?? null }
  }, [testResult])

  const livePreview = useMemo(() => {
    if (!form.outputTemplate || parsedBody == null) return null
    try {
      const ctx = Array.isArray(parsedBody) ? { items: parsedBody } : parsedBody
      return Handlebars.compile(form.outputTemplate)(ctx as object)
    } catch (e: any) { return `<!-- Template error: ${e?.message} -->` }
  }, [form.outputTemplate, parsedBody])

  const handleDeleteConfirm = async () => {
    if (!editTool) return
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/tools/${encodeURIComponent(editTool.name)}`)
      onDeleted?.(editTool.name)
      setDeleteConfirmOpen(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const handleTest = async () => {
    setTesting(true); setTestError('')
    setSchemaApplied(false); setScalars([]); setArrays([])
    try {
      const parameterMap: ParameterMapping[] = form.params.map((p) => ({
        toolParamName: p.toolParamName, source: p.source,
        originalName: p.originalName || p.toolParamName, required: p.required,
      }))
      const endpointRef = { method: form.method, path: form.path, baseUrl: projectBaseUrl, contentType: form.contentType, parameterMap }
      const builtArgs: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(testArgs)) { if (v !== '') builtArgs[k] = v }
      const { data } = await api.post(`/swagger/servers/${projectId}/test-endpoint`, { endpointRef, args: builtArgs })
      setTestResult(data)
      try { setParsedBody(JSON.parse(data.body)) } catch { setParsedBody(null) }
    } catch (err: any) {
      setTestError(err?.response?.data?.message ?? t('error.requestFailed'))
      setTestResult(null); setParsedBody(null)
    } finally { setTesting(false) }
  }

  const handleUseSchema = async () => {
    if (parsedBody == null) return
    const root = Array.isArray(parsedBody) ? { items: parsedBody } : parsedBody
    const { scalars: s, arrays: a } = extractHbSchema(root)
    setScalars(s); setArrays(a); setSchemaApplied(true)
    // Endpoint mode: persist outputSchema to backend (if editing), or capture for new create
    if (isEndpoint) {
      const schema = inferSchema(parsedBody)
      setCapturedSchema(schema)
      if (isEdit && editTool) {
        setSavingSchema(true)
        try {
          await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(editTool.name)}/output-schema`, { outputSchema: schema })
        } finally { setSavingSchema(false) }
      }
    }
  }

  const copyBlock = (arr: HbArray) => {
    const inner = arr.itemScalars.length > 0 ? arr.itemScalars.map((f) => `  {{${f}}}`).join('\n') : '  {{this}}'
    navigator.clipboard?.writeText(`{{#each ${arr.path}}}\n${inner}\n{{/each}}`)
  }

  const setField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }))
  const setParam = (id: string, field: keyof ParamEntry, value: any) =>
    setForm((prev) => ({ ...prev, params: prev.params.map((p) => p.id === id ? { ...p, [field]: value } : p) }))
  const addParam = () => setForm((prev) => ({ ...prev, params: [...prev.params, emptyParam()] }))
  const removeParam = (id: string) => setForm((prev) => ({ ...prev, params: prev.params.filter((p) => p.id !== id) }))
  const setHeader = (id: string, field: keyof HeaderEntry, value: string) =>
    setForm((prev) => ({ ...prev, staticHeaders: prev.staticHeaders.map((h) => h.id === id ? { ...h, [field]: value } : h) }))
  const addHeader = () => setForm((prev) => ({ ...prev, staticHeaders: [...prev.staticHeaders, emptyHeader()] }))
  const removeHeader = (id: string) => setForm((prev) => ({ ...prev, staticHeaders: prev.staticHeaders.filter((h) => h.id !== id) }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('error.resourceNameRequired')); return }
    if (!form.path.trim()) { setError(t('error.pathRequired')); return }
    setSaving(true); setError('')
    try {
      const parameterMap: ParameterMapping[] = form.params.map((p) => ({
        toolParamName: p.toolParamName,
        source: p.source,
        originalName: p.originalName || p.toolParamName,
        required: p.required,
      }))
      // inputSchema belongs to the endpoint — tools in tool mode always delegate to the source endpoint
      const inputSchema = !isEndpoint
        ? { type: 'object', properties: {} }
        : (() => {
            const properties: Record<string, any> = {}
            const required: string[] = []
            for (const p of form.params) {
              if (!p.toolParamName) continue
              properties[p.toolParamName] = { type: p.type, ...(p.description ? { description: p.description } : {}) }
              if (p.required) required.push(p.toolParamName)
            }
            return { type: 'object', properties, ...(required.length ? { required } : {}) }
          })()
      const staticHeaders = form.staticHeaders
        .filter((h) => h.name.trim())
        .map((h) => ({ name: h.name.trim(), value: h.value }))
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        method: form.method,
        path: form.path.trim(),
        baseUrl: projectBaseUrl,
        contentType: form.contentType.trim() || 'application/json',
        parameterMap,
        inputSchema,
        ...(staticHeaders.length ? { staticHeaders } : {}),
        ...(form.useOutputTemplate && form.outputTemplate.trim() ? { outputTemplate: form.outputTemplate.trim() } : {}),
        ...(errorMessage.trim() ? { errorConfig: { message: errorMessage.trim() } } : {}),
        // When creating from an endpoint picker, store the source reference
        ...(!isEdit && prefillFrom ? { endpointSource: prefillFrom.name } : {}),
        // Endpoint mode: include captured outputSchema for new endpoints
        ...(isEndpoint && !isEdit && capturedSchema ? { outputSchema: capturedSchema } : {}),
      }
      let res: any
      if (isEdit) {
        res = await api.put(`/swagger/servers/${projectId}/tools/${encodeURIComponent(editTool!.name)}`, payload)
      } else {
        res = await api.post(`/swagger/servers/${projectId}/tools`, payload)
      }
      const project: Project = res.data
      const savedTool = project.tools.find((t) => t.name === payload.name) ?? (payload as any)
      onSaved(savedTool, isEdit ? editTool!.name : undefined)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('error.baseUrlSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const paramBuilder = (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} display="inline">{t('heading.parameters')}</Typography>
          {form.params.length > 0 && (
            <Typography variant="caption" color="text.disabled" ml={1}>{form.params.length} defined</Typography>
          )}
        </Box>
        <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addParam}
          sx={{ fontSize: '0.75rem', py: 0.4, px: 1.25, minWidth: 0 }}>
          {t('common:action.add')}
        </Button>
      </Box>
      {form.params.length === 0 ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2.5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.disabled">{t('label.noParameters')}</Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {form.params.map((p, i) => (
            <Paper key={p.id} variant="outlined" sx={{ overflow: 'hidden', borderColor: 'divider', '&:hover': { borderColor: 'text.disabled' }, transition: 'border-color 0.15s' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 1.25, pb: 0.75 }}>
                <Box sx={{ minWidth: 20, height: 20, borderRadius: '4px', bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize="0.65rem" lineHeight={1}>{i + 1}</Typography>
                </Box>
                <TextField size="small" placeholder="param_name" value={p.toolParamName}
                  onChange={(e) => setParam(p.id, 'toolParamName', e.target.value)}
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                  sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                <FormControl size="small" sx={{ minWidth: 100, flexShrink: 0 }}>
                  <Select value={p.source} onChange={(e) => setParam(p.id, 'source', e.target.value as any)}
                    renderValue={(v) => <Chip label={v} size="small" color={SOURCE_CHIP_COLOR[v as keyof typeof SOURCE_CHIP_COLOR] ?? 'default'} sx={{ fontSize: '0.68rem', height: 18, fontWeight: 700, cursor: 'pointer' }} />}
                    sx={{ '& .MuiSelect-select': { py: '5px' } }}>
                    {SOURCES.map((s) => (
                      <MenuItem key={s} value={s}>
                        <Chip label={s} size="small" color={SOURCE_CHIP_COLOR[s] ?? 'default'} sx={{ fontSize: '0.7rem', height: 20, fontWeight: 700 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title={t('action.removeParameter')}>
                  <IconButton size="small" color="error" onClick={() => removeParam(p.id)} sx={{ flexShrink: 0 }}>
                    <IconTrash size={15} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pb: 1.25, pl: '44px' }}>
                <TextField size="small" label="API name" value={p.originalName}
                  onChange={(e) => setParam(p.id, 'originalName', e.target.value)}
                  placeholder={p.toolParamName || 'same as MCP name'}
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }} sx={{ flexGrow: 1 }} />
                <FormControl size="small" sx={{ minWidth: 105, flexShrink: 0 }}>
                  <InputLabel>{t('common:label.type')}</InputLabel>
                  <Select value={p.type} label={t('common:label.type')} onChange={(e) => setParam(p.id, 'type', e.target.value)}>
                    {PARAM_TYPES.map((t) => (
                      <MenuItem key={t} value={t}><Typography fontFamily="monospace" fontSize="0.82rem">{t}</Typography></MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch size="small" checked={p.required} onChange={(e) => setParam(p.id, 'required', e.target.checked)} />}
                  label={<Typography variant="caption" color={p.required ? 'error.main' : 'text.disabled'} fontWeight={p.required ? 700 : 400}>{t('label.required')}</Typography>}
                  sx={{ m: 0, flexShrink: 0 }} />
              </Box>
              <Box sx={{ px: 1.5, pb: 1.25, pl: '44px', borderTop: '1px solid', borderColor: 'action.hover' }}>
                <TextField size="small" fullWidth multiline minRows={3} maxRows={8} label={t('common:label.description')}
                  placeholder="Describe this parameter so the AI knows what to pass…"
                  value={p.description} onChange={(e) => setParam(p.id, 'description', e.target.value)}
                  sx={{ mt: 1, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }} />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )

  return (
    <>
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: isEndpoint ? 560 : 760 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>
          {isEdit ? t('action.editEntity', { entity: entityLabel, name: editTool?.name ?? '' }) : t('action.createEntity', { entity: entityLabel })}
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={saving || deleting}>
          <IconX size={18} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {isEndpoint ? (
          /* ── Endpoint mode: simple flat form ── */
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField size="small" fullWidth required label={t('common:label.name')} value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth required>
                <InputLabel>{t('label.httpMethod')}</InputLabel>
                <Select value={form.method} label={t('label.httpMethod')} onChange={(e) => setField('method', e.target.value)}>
                  {METHODS.map((m) => (
                    <MenuItem key={m} value={m}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: METHOD_COLOR[m] ?? '#888', flexShrink: 0 }} />
                        <Typography fontWeight={600} fontSize="0.85rem">{m}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={3} maxRows={8} label={t('common:label.description')} value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth required label={t('label.path')} value={form.path} onChange={(e) => setField('path', e.target.value)} placeholder="/users/{id}" helperText={t('hint.pathCombined', { baseUrl: projectBaseUrl })} InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label={t('label.contentType')} value={form.contentType} onChange={(e) => setField('contentType', e.target.value)} placeholder="application/json" />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} display="inline">{t('heading.requestHeaders')}</Typography>
                  {form.staticHeaders.length > 0 && <Typography variant="caption" color="text.disabled" ml={1}>{form.staticHeaders.length} defined</Typography>}
                </Box>
                <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addHeader} sx={{ fontSize: '0.75rem', py: 0.4, px: 1.25, minWidth: 0 }}>{t('common:action.add')}</Button>
              </Box>
              {form.staticHeaders.length === 0 ? (
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">{t('empty.noFixedHeaders')}</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={0.75}>
                  {form.staticHeaders.map((h) => (
                    <Box key={h.id} display="flex" alignItems="center" gap={1}>
                      <TextField size="small" placeholder="Header-Name" value={h.name} onChange={(e) => setHeader(h.id, 'name', e.target.value)} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} sx={{ width: 180, flexShrink: 0 }} />
                      <TextField size="small" fullWidth placeholder="value" value={h.value} onChange={(e) => setHeader(h.id, 'value', e.target.value)} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} />
                      <Tooltip title={t('common:action.remove')}><IconButton size="small" color="error" onClick={() => removeHeader(h.id)}><IconTrash size={15} /></IconButton></Tooltip>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>{paramBuilder}</Grid>
            {/* Test & output schema — endpoint mode */}
            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Box display="flex" alignItems="center" gap={1} mt={1.5} mb={1.5}>
                <Typography variant="subtitle2" fontWeight={700}>{t('heading.testOutputSchema')}</Typography>
                {(editTool?.outputSchema || capturedSchema) && (
                    <Chip size="small" label={t('label.schemaConfigured')} color="success" sx={{ fontSize: '0.65rem', height: 18 }} />
                )}
              </Box>
              {form.params.length > 0 && (
                <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                  {form.params.map((p) => (
                    <TextField key={p.toolParamName} size="small" fullWidth label={p.toolParamName}
                      helperText={p.required ? t('label.sourceRequired', { source: p.source }) : t('label.sourceOnly', { source: p.source })}
                      value={testArgs[p.toolParamName] ?? ''}
                      onChange={(e) => setTestArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                  ))}
                </Box>
              )}
              <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
                <Button size="small" variant="outlined"
                  startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={handleTest} disabled={testing || !form.path.trim()}>
                  {testing ? t('action.running') : t('action.testEndpoint')}
                </Button>
                {testResult && parsedBody != null && (
                  <Button size="small" variant="outlined" color="success"
                    disabled={savingSchema}
                    startIcon={savingSchema ? <CircularProgress size={14} color="inherit" /> : undefined}
                    onClick={() => handleUseSchema()}>
                    {savingSchema ? t('common:action.saving') : schemaApplied ? t('action.refreshSchema') : t('action.useResponseSchema')}
                  </Button>
                )}
              </Box>
              {testError && <Alert severity="error" sx={{ mb: 1 }}>{testError}</Alert>}
              {testResult && (
                <Box mb={schemaApplied ? 1.5 : 0}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>HTTP {testResult.status}</Typography>
                  <Box component="pre" sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, overflow: 'auto', maxHeight: 200, fontSize: '0.75rem', fontFamily: 'monospace', m: 0 }}>
                    {rawPreview?.slice(0, 3000)}{(rawPreview?.length ?? 0) > 3000 && '\n… (truncated)'}
                  </Box>
                </Box>
              )}
              {schemaApplied && scalars.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>{t('label.outputSchemaVars')}</Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {scalars.map((s) => (
                      <Chip key={s.path} size="small" label={`{{${s.path}}}`}
                        onClick={() => navigator.clipboard?.writeText(`{{${s.path}}}`)}
                        sx={{ fontFamily: 'monospace', fontSize: '0.72rem', cursor: 'pointer' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        ) : (
          /* ── Tool mode: 4-section layout ── */
          <Box display="flex" flexDirection="column" gap={3}>

            {/* Section 1 — Endpoint (always read-only; endpoint is configured on the endpoint itself) */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('section.endpoint')}</Typography>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    minWidth: 52, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                    fontSize: '0.7rem', color: METHOD_COLOR[form.method] ?? '#888',
                    bgcolor: 'action.selected', borderRadius: '4px', px: 0.75, py: 0.25,
                  }}>
                    {form.method.toUpperCase()}
                  </Box>
                  <Typography fontFamily="monospace" fontSize="0.84rem" fontWeight={600} flexGrow={1}>
                    {form.path}
                  </Typography>
                  {linkedSourceName && (
                    <Chip size="small" label={linkedSourceName}
                      sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 18, flexShrink: 0 }} />
                  )}
                </Box>
                {(prefillFrom?.description || editTool?.description) && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5} pl={8}>
                    {prefillFrom?.description ?? editTool?.description}
                  </Typography>
                )}
              </Paper>
            </Box>

            <Divider />

            {/* Section 2 — Test & map response */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('heading.testMapResponse')}</Typography>
              {form.params.length > 0 && (
                <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                  {form.params.map((p) => (
                    <TextField key={p.toolParamName} size="small" fullWidth
                      label={p.toolParamName}
                      helperText={p.required ? t('label.sourceRequired', { source: p.source }) : t('label.sourceOnly', { source: p.source })}
                      value={testArgs[p.toolParamName] ?? ''}
                      onChange={(e) => setTestArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                  ))}
                </Box>
              )}
              <Box display="flex" gap={1} mb={1.5}>
                <Button size="small" variant="outlined"
                  startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={handleTest} disabled={testing || !form.path.trim()}>
                  {testing ? t('action.running') : t('action.testEndpoint')}
                </Button>
              </Box>
              {testError && <Alert severity="error" sx={{ mb: 1 }}>{testError}</Alert>}
              {testResult && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>HTTP {testResult.status}</Typography>
                  <Box component="pre" sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, overflow: 'auto', maxHeight: 180, fontSize: '0.75rem', fontFamily: 'monospace', m: 0 }}>
                    {rawPreview?.slice(0, 3000)}{(rawPreview?.length ?? 0) > 3000 && '\n… (truncated)'}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Section 3 — HTML template */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={form.useOutputTemplate ? 1.5 : 0}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" fontWeight={700}>{t('heading.htmlTemplate')}</Typography>
                  <Tooltip title={t('tooltip.handlebarsDoc')}>
                    <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html" target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                      <IconExternalLink size={13} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <FormControlLabel
                  control={<Switch size="small" checked={form.useOutputTemplate} onChange={(e) => setForm((prev) => ({ ...prev, useOutputTemplate: e.target.checked }))} />}
                  label={<Typography variant="body2">{form.useOutputTemplate ? t('status.on') : t('status.off')}</Typography>}
                  sx={{ m: 0 }}
                />
              </Box>
              {form.useOutputTemplate ? (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" mb={endpointOutputSchema ? 0.75 : 1}>
                    {t('hint.handlebarsHint')}
                  </Typography>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', mb: 0 }}>
                    <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }} TabIndicatorProps={{ sx: { height: 2 } }}>
                      <Tab label={t('common:action.code')} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
                      <Tab label={t('common:action.preview')} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
                    </Tabs>
                    <Box flexGrow={1} />
                    <Tooltip title={t('common:action.expandEditor')}>
                      <IconButton size="small" onClick={() => setTemplateExpanded(true)} sx={{ mr: 0.5 }}>
                        <IconArrowsMaximize size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ height: 360, border: 1, borderColor: 'divider', borderTop: 0, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                    {templateTab === 0 ? (
                      <MonacoEditor height="100%" language="html" value={form.outputTemplate}
                        theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
                        onChange={(v) => setForm((prev) => ({ ...prev, outputTemplate: v ?? '' }))}
                        options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true, padding: { top: 8 } }} />
                    ) : (
                      <iframe
                        srcDoc={livePreview ?? form.outputTemplate ?? `<p style="color:#888;font-family:sans-serif;padding:24px">${t('label.noContent')}</p>`}
                        sandbox="allow-same-origin"
                        style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                        title="Template preview" />
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {t('hint.handlebarsEnableToggle')}
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Section 4 — Metadata & error */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('section.metadataError')}</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField size="small" fullWidth required label={t('common:label.name')} value={form.name} onChange={(e) => setField('name', e.target.value)} />
                <TextField size="small" fullWidth multiline minRows={3} label={t('common:label.description')} value={form.description} onChange={(e) => setField('description', e.target.value)} />
                <TextField size="small" fullWidth label={t('label.errorMessage')} value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  helperText={t('hint.errorMessageHelp')} />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        {isEdit && can(Permission.ToolsDelete) && (
          <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}
            startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
            {t('action.deleteEntity', { entity: entityLabel })}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving || deleting}>{t('common:action.cancel')}</Button>
        {(isEdit ? can(Permission.ToolsEdit) : (isEndpoint ? can(Permission.EndpointsCreate) : can(Permission.ToolsCreate))) && (
          <Button variant="contained" onClick={handleSave} disabled={saving || deleting}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? t('common:action.saving') : isEdit ? t('common:action.saveChanges') : t('action.createEntity', { entity: entityLabel })}
          </Button>
        )}
      </Box>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('confirm.deleteEntity', { entity: entityLabel })}
        message={t('confirm.deleteEntityMessage', { name: editTool?.name ?? '' })}
        confirmLabel={t('common:action.delete')} confirmColor="error" loading={deleting}
        onConfirm={handleDeleteConfirm} onClose={() => setDeleteConfirmOpen(false)}
      />
    </Drawer>

    {/* Expanded Monaco — left drawer (tool mode) */}
    {!isEndpoint && (
      <Drawer anchor="left" open={templateExpanded} onClose={() => setTemplateExpanded(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 760px)' }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            <Typography variant="h6" fontWeight={700}>{t('heading.htmlTemplate')}</Typography>
            <Tooltip title={t('tooltip.handlebarsDocExpanded')}>
              <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html" target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                <IconExternalLink size={14} />
              </IconButton>
            </Tooltip>
          </Box>
          <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }} TabIndicatorProps={{ sx: { height: 2 } }}>
            <Tab label={t('common:action.code')} sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
            <Tab label={t('common:action.preview')} sx={{ minHeight: 36, fontSize: '0.8rem', py: 0 }} />
          </Tabs>
          <Box flexGrow={1} />
          <Tooltip title={t('common:action.collapse')}>
            <IconButton size="small" onClick={() => setTemplateExpanded(false)}>
              <IconArrowsMinimize size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {templateTab === 0 ? (
            <MonacoEditor height="100%" language="html" value={form.outputTemplate}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(v) => setForm((prev) => ({ ...prev, outputTemplate: v ?? '' }))}
              options={{ minimap: { enabled: true }, fontSize: 14, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true, padding: { top: 16 } }} />
          ) : (
            <iframe
              srcDoc={livePreview ?? form.outputTemplate ?? `<p style="color:#888;font-family:sans-serif;padding:24px">${t('label.noContentShort')}</p>`}
              sandbox="allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              title="Template preview expanded" />
          )}
        </Box>
      </Drawer>
    )}
    </>
  )
}
