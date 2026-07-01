import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer, FormControlLabel,
  IconButton, Paper, Switch, Tab, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconArrowsMaximize, IconArrowsMinimize, IconCopy,
  IconExternalLink, IconPlayerPlay,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import Handlebars from 'handlebars'
import { useColorMode } from '../../../../theme/ColorModeContext'
import api from '../../../../api'
import type { HbArray, HbScalar, ParameterMapping } from '../../types'
import { extractHbSchema } from '../../resources/DynamicResourceDialog'
import type { toolToFormState } from '../tool-form-utils'

export function ToolOutputTemplateSection({
  projectId,
  projectBaseUrl,
  form,
  setForm,
}: {
  projectId: string
  projectBaseUrl: string
  form: ReturnType<typeof toolToFormState>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof toolToFormState>>>
}) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const { mode: colorMode } = useColorMode()
  const [testArgs, setTestArgs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null)
  const [parsedBody, setParsedBody] = useState<unknown>(null)
  const [testError, setTestError] = useState('')
  const [scalars, setScalars] = useState<HbScalar[]>([])
  const [arrays, setArrays] = useState<HbArray[]>([])
  const [schemaApplied, setSchemaApplied] = useState(false)
  const [templateTab, setTemplateTab] = useState(0)
  const [templateExpanded, setTemplateExpanded] = useState(false)

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

  const handleUseSchema = () => {
    if (parsedBody == null) return
    const root = Array.isArray(parsedBody) ? { items: parsedBody } : parsedBody
    const { scalars: s, arrays: a } = extractHbSchema(root)
    setScalars(s); setArrays(a); setSchemaApplied(true)
  }

  const copyBlock = (arr: HbArray) => {
    const inner = arr.itemScalars.length > 0 ? arr.itemScalars.map((f) => `  {{${f}}}`).join('\n') : '  {{this}}'
    navigator.clipboard?.writeText(`{{#each ${arr.path}}}\n${inner}\n{{/each}}`)
  }

  const monacoEditor = (expanded: boolean) => (
    <MonacoEditor
      height="100%"
      language="html"
      value={form.outputTemplate}
      theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
      onChange={(v) => setForm((prev) => ({ ...prev, outputTemplate: v ?? '' }))}
      options={{
        minimap: { enabled: expanded },
        fontSize: expanded ? 14 : 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        padding: { top: expanded ? 16 : 8 },
      }}
    />
  )

  const previewFrame = (title: string) => (
    <iframe
      srcDoc={livePreview ?? form.outputTemplate ?? `<p style="color:#888;font-family:sans-serif;padding:24px">${t('label.noContent')}</p>`}
      sandbox="allow-same-origin"
      style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
      title={title}
    />
  )

  return (
    <>
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={form.useOutputTemplate ? 2 : 0}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} display="inline">{t('heading.htmlOutputTemplate')}</Typography>
          <Typography variant="caption" color="text.secondary" ml={1}>
            {t('hint.handlebarsTransform')}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch size="small" checked={form.useOutputTemplate}
              onChange={(e) => setForm((prev) => ({ ...prev, useOutputTemplate: e.target.checked }))} />
          }
          label={<Typography variant="body2">{form.useOutputTemplate ? t('status.on') : t('status.off')}</Typography>}
          sx={{ m: 0 }}
        />
      </Box>

      {form.useOutputTemplate && (
        <Box display="flex" flexDirection="column" gap={2.5}>

          {/* Test & schema */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('heading.testMapResponse')}</Typography>
            {form.params.length > 0 && (
              <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('hint.testParamValues')}</Typography>
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
              {testResult && parsedBody != null && (
                <Button size="small" variant="outlined" color="success" onClick={handleUseSchema}>
                  {schemaApplied ? t('action.refreshSchema') : t('action.useResponseSchema')}
                </Button>
              )}
            </Box>

            {testError && <Alert severity="error" sx={{ mb: 1 }}>{testError}</Alert>}

            {testResult && (
              <Box mb={schemaApplied ? 1.5 : 0}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>HTTP {testResult.status}</Typography>
                <Box component="pre" sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, overflow: 'auto', maxHeight: 180, fontSize: '0.75rem', fontFamily: 'monospace', m: 0 }}>
                  {rawPreview?.slice(0, 3000)}{(rawPreview?.length ?? 0) > 3000 && '\n… (truncated)'}
                </Box>
              </Box>
            )}

            {schemaApplied && (
              <Box display="flex" flexDirection="column" gap={2}>
                {scalars.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>{t('heading.scalarVariables')}</Typography>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ py: 0.5, fontWeight: 700, fontSize: '0.72rem', width: '42%' }}>{t('label.variable')}</TableCell>
                            <TableCell sx={{ py: 0.5, fontWeight: 700, fontSize: '0.72rem' }}>{t('label.sampleValue')}</TableCell>
                            <TableCell sx={{ py: 0.5, width: 36 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {scalars.map((s) => (
                            <TableRow key={s.path} hover>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main">{`{{${s.path}}}`}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace"
                                  sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                  {s.sample !== '' ? s.sample : <em style={{ opacity: 0.5 }}>(empty)</em>}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Tooltip title={t('common:action.copy')}>
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

                {arrays.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                      {t('heading.arrayVariables')} - use <code style={{ fontFamily: 'monospace' }}>{'{{#each}}'}</code> to iterate
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {arrays.map((a) => {
                        const inner = a.itemScalars.length > 0 ? a.itemScalars.map((f) => `  {{${f}}}`).join('\n') : '  {{this}}'
                        const block = `{{#each ${a.path}}}\n${inner}\n{{/each}}`
                        return (
                          <Paper key={a.path} variant="outlined" sx={{ p: 1.25 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                              <Box flexGrow={1} minWidth={0}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main" fontWeight={700}>
                                    {`{{#each ${a.path}}}`}
                                  </Typography>
                                  <Chip label={t('label.itemCount', { count: a.length })} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                </Box>
                                <Box component="pre" sx={{ m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 0.75, fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto', lineHeight: 1.5 }}>
                                  {block}
                                </Box>
                                {a.itemScalars.length > 0 && (
                                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                                    <Typography variant="caption" color="text.secondary" alignSelf="center">{t('label.fieldsInsideBlock')}</Typography>
                                    {a.itemScalars.map((f) => (
                                      <Chip key={f} label={`{{${f}}}`} size="small" variant="outlined"
                                        onClick={() => navigator.clipboard?.writeText(`{{${f}}}`)}
                                        sx={{ fontSize: '0.67rem', height: 18, fontFamily: 'monospace', cursor: 'pointer' }} />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Tooltip title={t('action.copyBlock')}>
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

          {/* HTML template editor */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>{t('heading.htmlTemplate')}</Typography>
              <Tooltip title={t('tooltip.handlebarsDoc')}>
                <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html"
                  target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                  <IconExternalLink size={13} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {t('hint.handlebarsHint')}
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', mb: 0 }}>
              <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }}
                TabIndicatorProps={{ sx: { height: 2 } }}>
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
              {templateTab === 0 ? monacoEditor(false) : previewFrame('Template preview')}
            </Box>
          </Box>
        </Box>
      )}
    </Box>

    {/* Expanded Monaco — left drawer */}
    <Drawer anchor="left" open={templateExpanded} onClose={() => setTemplateExpanded(false)}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 560px)' }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
          <Typography variant="h6" fontWeight={700}>{t('heading.htmlTemplate')}</Typography>
          <Tooltip title={t('tooltip.handlebarsDocExpanded')}>
            <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html"
              target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
              <IconExternalLink size={14} />
            </IconButton>
          </Tooltip>
        </Box>
        <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }}
          TabIndicatorProps={{ sx: { height: 2 } }}>
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
        {templateTab === 0 ? monacoEditor(true) : previewFrame('Template preview expanded')}
      </Box>
    </Drawer>
    </>
  )
}
