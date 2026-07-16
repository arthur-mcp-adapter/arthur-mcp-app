import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconChevronDown,
  IconCopy,
  IconPlayerPlay,
  IconSearch,
} from '@tabler/icons-react'
import api from '../../api'
import { parseMcpResponse } from '../../utils/mcpResponse'
import { resolveMcpServerIdentifier } from '../../utils/mcpUrl'
import type { JsonSchema } from './jsonSchema.interface'
import type { ParameterMapping } from './parameterMapping.interface'
import type { EndpointRef } from './endpointRef.interface'
import type { GeneratedTool } from './generatedTool.interface'
import type { DocsResource } from './docsResource.interface'
import type { DocsProject } from './docsProject.interface'
import type { GlobalPrompt } from './globalPrompt.interface'
import type { TypeBadgeProps } from './typeBadgeProps.interface'
import type { FieldInputProps } from './fieldInputProps.interface'
import type { ToolCardProps } from './toolCardProps.interface'
import type { ResourceCardProps } from './resourceCardProps.interface'
import type { PromptCardProps } from './promptCardProps.interface'
import type { McpDocsContentProps } from './mcpDocsContentProps.interface'
import { METHOD_BG } from './constants/methodBg.constant'




// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <Box component="span" sx={{
      display: 'inline-block', px: 0.8, py: 0.15, borderRadius: '3px',
      fontSize: '0.68rem', border: '1px solid', borderColor: 'divider', color: 'text.secondary', fontFamily: 'monospace',
    }}>
      {type ?? 'string'}
    </Box>
  )
}

function FieldInput({ name, schema, value, required, onChange }: FieldInputProps) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum && schema.enum.length > 0) {
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
        label={<Typography variant="body2" color="text.secondary">{label}{schema.description && <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>— {schema.description}</Typography>}</Typography>}
      />
    )
  }
  const isJson = schema.type === 'object' || schema.type === 'array'
  return (
    <TextField size="small" fullWidth label={label} value={value} onChange={(e) => onChange(e.target.value)}
      helperText={schema.description} type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
      multiline={isJson} minRows={isJson ? 6 : 1} maxRows={isJson ? 16 : 4}
      InputProps={isJson ? { sx: { fontFamily: 'monospace', fontSize: '0.82rem' } } : undefined}
      placeholder={schema.type === 'object' ? '{"key": "value"}' : schema.type === 'array' ? '["item1"]' : undefined} />
  )
}

// ─── Tool card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, projectId, mcpApiKey }: ToolCardProps) {
  const { t } = useTranslation('servers')
  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [exampleCopied, setExampleCopied] = useState(false)

  const { path, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  const requiredFields = tool.inputSchema.required ?? []
  const paramEntries = Object.entries(properties)
  const paramMapByName = new Map((parameterMap ?? []).map((p) => [p.toolParamName, p]))

  const mcpExample = JSON.stringify({
    jsonrpc: '2.0', method: 'tools/call', id: 1,
    params: { name: tool.name, arguments: Object.fromEntries(paramEntries.map(([k, v]) => [k, `<${v.type ?? 'string'}>`])) },
  }, null, 2)

  const handleCopyExample = () => {
    navigator.clipboard.writeText(mcpExample)
    setExampleCopied(true)
    setTimeout(() => setExampleCopied(false), 2000)
  }

  const handleExecute = async () => {
    setExecuting(true); setResponse(null); setResponseIsError(false)
    try {
      const args: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(formValues)) {
        if (val === '') continue
        const schema = properties[key]
        if (schema?.type === 'number' || schema?.type === 'integer') args[key] = Number(val)
        else if (schema?.type === 'boolean') args[key] = val === 'true'
        else if (schema?.type === 'object' || schema?.type === 'array') {
          try { args[key] = JSON.parse(val) } catch { args[key] = val }
        } else args[key] = val
      }
      const payload = { jsonrpc: '2.0', method: 'tools/call', id: Date.now(), params: { name: tool.name, arguments: args } }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (mcpApiKey) headers['auth'] = mcpApiKey
      const res = await api.post(`/mcp/server/${projectId}`, payload, { headers })
      const rpc = parseMcpResponse(res.data)
      if (rpc?.error) { setResponse(JSON.stringify(rpc.error, null, 2)); setResponseIsError(true); return }
      const content = rpc?.result?.content ?? rpc?.content
      if (rpc?.result?.isError ?? rpc?.isError) setResponseIsError(true)
      const text = content?.[0]?.text ?? JSON.stringify(rpc?.result ?? rpc, null, 2)
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)) } catch { setResponse(text) }
    } catch (err: any) {
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Unknown error')
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{ mb: 0.75, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{
        bgcolor: METHOD_BG[tool.endpointRef?.method?.toUpperCase()] ?? 'action.hover',
        borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', '&.Mui-expanded': { borderRadius: '7px 7px 0 0' }, px: 2,
      }}>
        <Box display="flex" alignItems="center" gap={1.5} width="100%" minWidth={0}>
          <Typography fontWeight={700} fontSize="0.875rem" noWrap>{tool.name}</Typography>
          {tool.description && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
              — {tool.description}
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {tool.description && <Typography variant="body2" color="text.secondary" mb={2.5}>{tool.description}</Typography>}

        {/* Parameters table */}
        {paramEntries.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('docs.parameters')}</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
              <Table size="small" sx={{
                minWidth: 500,
                '& th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem', verticalAlign: 'middle' },
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('docs.colName')}</TableCell><TableCell>{t('docs.colSource')}</TableCell>
                    <TableCell>{t('docs.colType')}</TableCell><TableCell>{t('docs.colRequired')}</TableCell><TableCell>{t('docs.colDescription')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paramEntries.map(([name, schema]) => {
                    const mapping = paramMapByName.get(name)
                    const isRequired = requiredFields.includes(name)
                    return (
                      <TableRow key={name} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{name}</Typography></TableCell>
                        <TableCell>{(() => { const source = mapping?.source ?? 'query'; return <Chip label={source} size="small" variant="outlined" color={source === 'path' ? 'secondary' : source === 'body' ? 'warning' : source === 'header' ? 'error' : 'primary'} sx={{ height: 18, fontSize: '0.65rem' }} /> })()}</TableCell>
                        <TableCell><TypeBadge type={schema.type} /></TableCell>
                        <TableCell>
                          {isRequired
                            ? <Typography color="error.main" fontSize="0.75rem" fontWeight={700}>{t('docs.required')}</Typography>
                            : <Typography color="text.disabled" fontSize="0.75rem">{t('docs.optional')}</Typography>}
                        </TableCell>
                        <TableCell><Typography color="text.secondary" fontSize="0.78rem">{schema.description ?? '—'}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Try it out */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode && paramEntries.length ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>{t('docs.tryItOut')}</Typography>
          <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
            onClick={() => { setTryMode((v) => !v); setResponse(null) }}
            sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
            {tryMode ? t('docs.cancel') : t('docs.try')}
          </Button>
        </Box>

        {tryMode && (
          <Box>
            {paramEntries.length > 0
              ? <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
                  {paramEntries.map(([name, schema]) => (
                    <FieldInput key={name} name={name} schema={schema} value={formValues[name] ?? ''}
                      required={requiredFields.includes(name)} onChange={(v) => setFormValues((prev) => ({ ...prev, [name]: v }))} />
                  ))}
                </Box>
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>{t('docs.noParameters')}</Typography>}
            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={16} />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? t('docs.executing') : t('docs.execute')}
            </Button>
            {response !== null && (
              <Box component="pre" sx={{
                bgcolor: responseIsError ? 'error.light' : '#1e1e1e', color: responseIsError ? 'error.dark' : '#d4d4d4',
                border: '1px solid', borderColor: responseIsError ? 'error.light' : 'transparent',
                p: 2, borderRadius: 1, fontSize: '0.78rem', overflowX: 'auto', overflowY: 'auto',
                maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
              }}>
                {response}
              </Box>
            )}
          </Box>
        )}

        {/* MCP JSON example */}
        {!tryMode && (
          <Box mt={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
              {t('docs.mcpCallExample')}
            </Typography>
            <Box component="pre" sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1, fontSize: '0.75rem', overflowX: 'auto', position: 'relative', m: 0 }}>
              <Tooltip title={exampleCopied ? t('docs.copied') : t('docs.copy')}>
                <IconButton size="small" onClick={handleCopyExample}
                  sx={{ position: 'absolute', top: 8, right: 8, color: exampleCopied ? 'primary.light' : '#d4d4d4', '&:hover': { color: '#fff' } }}>
                  <IconCopy size={15} />
                </IconButton>
              </Tooltip>
              {mcpExample}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, projectId, mcpApiKey }: ResourceCardProps) {
  const { t } = useTranslation('servers')
  const [tryMode, setTryMode] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [exampleCopied, setExampleCopied] = useState(false)

  const mcpExample = JSON.stringify({
    jsonrpc: '2.0', method: 'resources/read', id: 1,
    params: { uri: resource.uri },
  }, null, 2)

  const handleCopyExample = () => {
    navigator.clipboard.writeText(mcpExample)
    setExampleCopied(true)
    setTimeout(() => setExampleCopied(false), 2000)
  }

  const handleExecute = async () => {
    setExecuting(true); setResponse(null); setResponseIsError(false)
    try {
      const payload = { jsonrpc: '2.0', method: 'resources/read', id: Date.now(), params: { uri: resource.uri } }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (mcpApiKey) headers['auth'] = mcpApiKey
      const res = await api.post(`/mcp/server/${projectId}`, payload, { headers })
      const rpc = parseMcpResponse(res.data)
      if (rpc?.error) { setResponse(JSON.stringify(rpc.error, null, 2)); setResponseIsError(true); return }
      const text = JSON.stringify(rpc?.result ?? rpc, null, 2)
      setResponse(text)
    } catch (err: any) {
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Unknown error')
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{ mb: 0.75, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{
        bgcolor: 'action.hover', borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', '&.Mui-expanded': { borderRadius: '7px 7px 0 0' }, px: 2,
      }}>
        <Box display="flex" alignItems="center" gap={1.5} width="100%" minWidth={0}>
          <Typography fontWeight={700} fontSize="0.875rem" noWrap>{resource.name}</Typography>
          {resource.description && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
              — {resource.description}
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {resource.description && <Typography variant="body2" color="text.secondary" mb={2.5}>{resource.description}</Typography>}

        {/* URI + MIME type info row */}
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5} flexWrap="wrap">
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 0.75, display: 'inline-block', border: '1px solid', borderColor: 'divider' }}>
            <Typography fontFamily="monospace" fontSize="0.8rem" color="text.secondary">{resource.uri}</Typography>
          </Box>
          {resource.mimeType && (
            <Chip label={resource.mimeType} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Try it out */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>{t('docs.tryItOut')}</Typography>
          <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
            onClick={() => { setTryMode((v) => !v); setResponse(null) }}
            sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
            {tryMode ? t('docs.cancel') : t('docs.try')}
          </Button>
        </Box>

        {tryMode && (
          <Box>
            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={16} />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? t('docs.executing') : t('docs.execute')}
            </Button>
            {response !== null && (
              <Box component="pre" sx={{
                bgcolor: responseIsError ? 'error.light' : '#1e1e1e', color: responseIsError ? 'error.dark' : '#d4d4d4',
                border: '1px solid', borderColor: responseIsError ? 'error.light' : 'transparent',
                p: 2, borderRadius: 1, fontSize: '0.78rem', overflowX: 'auto', overflowY: 'auto',
                maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, mt: 2,
              }}>
                {response}
              </Box>
            )}
          </Box>
        )}

        {/* MCP JSON example */}
        {!tryMode && (
          <Box mt={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
              {t('docs.mcpCallExample')}
            </Typography>
            <Box component="pre" sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1, fontSize: '0.75rem', overflowX: 'auto', position: 'relative', m: 0 }}>
              <Tooltip title={exampleCopied ? t('docs.copied') : t('docs.copy')}>
                <IconButton size="small" onClick={handleCopyExample}
                  sx={{ position: 'absolute', top: 8, right: 8, color: exampleCopied ? 'primary.light' : '#d4d4d4', '&:hover': { color: '#fff' } }}>
                  <IconCopy size={15} />
                </IconButton>
              </Tooltip>
              {mcpExample}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

// ─── Prompt card ──────────────────────────────────────────────────────────────

function PromptCard({ prompt, projectId, mcpApiKey }: PromptCardProps) {
  const { t } = useTranslation('servers')
  const args = [...new Set([...prompt.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]

  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [exampleCopied, setExampleCopied] = useState(false)

  const mcpExample = JSON.stringify({
    jsonrpc: '2.0', method: 'prompts/get', id: 1,
    params: { name: prompt.name, arguments: Object.fromEntries(args.map((a) => [a, '<string>'])) },
  }, null, 2)

  const handleCopyExample = () => {
    navigator.clipboard.writeText(mcpExample)
    setExampleCopied(true)
    setTimeout(() => setExampleCopied(false), 2000)
  }

  const handleExecute = async () => {
    setExecuting(true); setResponse(null); setResponseIsError(false)
    try {
      const payload = {
        jsonrpc: '2.0', method: 'prompts/get', id: Date.now(),
        params: { name: prompt.name, arguments: formValues },
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (mcpApiKey) headers['auth'] = mcpApiKey
      const res = await api.post(`/mcp/server/${projectId}`, payload, { headers })
      const rpc = parseMcpResponse(res.data)
      if (rpc?.error) { setResponse(JSON.stringify(rpc.error, null, 2)); setResponseIsError(true); return }
      const result = rpc?.result ?? rpc
      const text = result?.messages?.[0]?.content?.text ?? JSON.stringify(result, null, 2)
      setResponse(text)
    } catch (err: any) {
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Unknown error')
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{ mb: 0.75, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{
        bgcolor: 'action.hover', borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', '&.Mui-expanded': { borderRadius: '7px 7px 0 0' }, px: 2,
      }}>
        <Box display="flex" alignItems="center" gap={1.5} width="100%" minWidth={0}>
          <Typography fontWeight={700} fontSize="0.875rem" noWrap>{prompt.name}</Typography>
          {prompt.description && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
              — {prompt.description}
            </Typography>
          )}
          {prompt.tags?.length > 0 && (
            <Box display="flex" gap={0.5} flexShrink={0} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {prompt.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
              ))}
            </Box>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {prompt.description && <Typography variant="body2" color="text.secondary" mb={2.5}>{prompt.description}</Typography>}

        {/* Tags row */}
        {prompt.tags?.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
            {prompt.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
            ))}
          </Box>
        )}

        {/* Arguments table */}
        {args.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('docs.arguments')}</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
              <Table size="small" sx={{
                minWidth: 400,
                '& th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem', verticalAlign: 'middle' },
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('docs.colName')}</TableCell>
                    <TableCell>{t('docs.colRequired')}</TableCell>
                    <TableCell>{t('docs.colDescription')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {args.map((arg) => (
                    <TableRow key={arg} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{arg}</Typography></TableCell>
                      <TableCell><Typography color="text.disabled" fontSize="0.75rem">{t('docs.optional')}</Typography></TableCell>
                      <TableCell><Typography color="text.secondary" fontSize="0.78rem">—</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Try it out */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode && args.length ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>{t('docs.tryItOut')}</Typography>
          <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
            onClick={() => { setTryMode((v) => !v); setResponse(null) }}
            sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
            {tryMode ? t('docs.cancel') : t('docs.try')}
          </Button>
        </Box>

        {tryMode && (
          <Box>
            {args.length > 0
              ? <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
                  {args.map((arg) => (
                    <TextField key={arg} size="small" fullWidth label={arg} placeholder="<string>"
                      value={formValues[arg] ?? ''}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [arg]: e.target.value }))} />
                  ))}
                </Box>
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>{t('docs.noArguments')}</Typography>}
            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={16} />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? t('docs.executing') : t('docs.execute')}
            </Button>
            {response !== null && (
              <Box component="pre" sx={{
                bgcolor: responseIsError ? 'error.light' : '#1e1e1e', color: responseIsError ? 'error.dark' : '#d4d4d4',
                border: '1px solid', borderColor: responseIsError ? 'error.light' : 'transparent',
                p: 2, borderRadius: 1, fontSize: '0.78rem', overflowX: 'auto', overflowY: 'auto',
                maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, mt: 2,
              }}>
                {response}
              </Box>
            )}
          </Box>
        )}

        {/* MCP JSON example */}
        {!tryMode && (
          <Box mt={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
              {t('docs.mcpCallExample')}
            </Typography>
            <Box component="pre" sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1, fontSize: '0.75rem', overflowX: 'auto', position: 'relative', m: 0 }}>
              <Tooltip title={exampleCopied ? t('docs.copied') : t('docs.copy')}>
                <IconButton size="small" onClick={handleCopyExample}
                  sx={{ position: 'absolute', top: 8, right: 8, color: exampleCopied ? 'primary.light' : '#d4d4d4', '&:hover': { color: '#fff' } }}>
                  <IconCopy size={15} />
                </IconButton>
              </Tooltip>
              {mcpExample}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export function McpDocsContent({ project: server, projectId }: McpDocsContentProps) {
  const { t } = useTranslation('servers')
  const [search, setSearch] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)
  const [resolvedPrompts, setResolvedPrompts] = useState<GlobalPrompt[]>([])

  useEffect(() => {
    const enabledRefs = (server.prompts ?? []).filter((p) => p.enabled !== false)
    const ids = enabledRefs.map((p) => p.promptId)
    if (ids.length === 0) { setResolvedPrompts([]); return }
    api.get<GlobalPrompt[]>('/prompts')
      .then((r) => setResolvedPrompts(r.data.filter((p) => ids.includes(p.id))))
      .catch(() => {})
  }, [server.prompts])

  const mcpServerIdentifier = resolveMcpServerIdentifier(server.shareSlug, projectId)
  const mcpUrl = `${window.location.origin}/api/mcp/server/${mcpServerIdentifier}`

  const enabledTools = (server.tools ?? []).filter((t) => t.enabled !== false)
  const filteredTools = enabledTools.filter((t) =>
    !search
    || t.name.toLowerCase().includes(search.toLowerCase())
    || (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'background.paper', px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{server.name}</Typography>
            {server.version && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700, alignSelf: 'flex-start', mt: 0.3 }}>
                {server.version}
              </Box>
            )}
          </Box>
          {server.description && <Typography color="text.secondary" variant="body2" mt={0.5}>{server.description}</Typography>}
        </Box>

        <Box px={3} py={2}>
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <Chip label={server.status === 'active' ? t('docs.statusActive') : t('docs.statusError')} color={server.status === 'active' ? 'success' : 'error'} size="small" />
            <Chip label={t('docs.toolsCount', { count: enabledTools.length })} size="small" color="primary" variant="outlined" />
          </Box>

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
            {t('label.mcpEndpoint')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1.25, border: '1px solid', borderColor: 'divider' }}>
            <Typography fontFamily="monospace" fontSize="0.85rem" flexGrow={1} sx={{ wordBreak: 'break-all', color: 'text.primary' }}>
              {mcpUrl}
            </Typography>
            <Tooltip title={urlCopied ? t('docs.copied') : t('docs.copyUrl')}>
              <IconButton size="small" onClick={() => { navigator.clipboard.writeText(mcpUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000) }} color={urlCopied ? 'primary' : 'default'}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          {server.mcpApiKey && (
            <Typography variant="caption" color="warning.main" mt={0.75} display="block" fontWeight={600}>
              {t('docs.authWarning')}
            </Typography>
          )}
          {!server.mcpApiKey && (
            <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
              {t('docs.configureUrl')}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Search */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5} flexWrap="wrap">
        <TextField size="small" placeholder={t('docs.searchToolPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }} />
        <Typography variant="body2" color="text.secondary" ml="auto">{t('docs.toolCount', { shown: filteredTools.length, total: enabledTools.length })}</Typography>
      </Box>

      {/* Tools */}
      {filteredTools.length === 0
        ? (
          <Box py={4} textAlign="center">
            <Typography color="text.secondary" variant="body2">{t('docs.noToolsMatch')}</Typography>
          </Box>
        )
        : filteredTools.map((tool) => <ToolCard key={tool.name} tool={tool} projectId={mcpServerIdentifier} mcpApiKey={server.mcpApiKey} />)}

      {/* Resources */}
      {(() => {
        const enabledResources = (server.resources ?? []).filter((r) => r.enabled !== false)
        return enabledResources.length > 0 ? (
          <Box mt={4}>
            <Divider sx={{ mb: 3 }} />
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="h6" fontWeight={700}>{t('docs.resources')}</Typography>
              <Chip label={t('docs.resourcesCount', { count: enabledResources.length })} size="small" color="primary" variant="outlined" />
            </Box>
            {enabledResources.map((r) => (
              <ResourceCard key={r.id} resource={r} projectId={mcpServerIdentifier} mcpApiKey={server.mcpApiKey} />
            ))}
          </Box>
        ) : null
      })()}

      {/* Prompts */}
      {resolvedPrompts.length > 0 && (
        <Box mt={4}>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>{t('docs.prompts')}</Typography>
            <Chip label={t('docs.promptsCount', { count: resolvedPrompts.length })} size="small" color="primary" variant="outlined" />
          </Box>
          {resolvedPrompts.map((p) => (
            <PromptCard key={p.id} prompt={p} projectId={mcpServerIdentifier} mcpApiKey={server.mcpApiKey} />
          ))}
        </Box>
      )}
    </Box>
  )
}
