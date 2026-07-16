import { useEffect, useState } from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Chip, CircularProgress, Divider,
  IconButton, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import {
  IconChevronDown, IconCopy, IconEdit, IconPlayerPlay,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import type { GeneratedTool } from '../../types'
import { METHOD_COLOR, METHOD_BG, SOURCE_CHIP_COLOR } from '../../constants'
import { buildCurl, buildMcpCurl } from '../utils'
import { FieldInput } from '../../resources/DynamicResourceDialog'
import { ToolCommentsSection } from '../ToolCommentsSection'
import { InlineEdit } from '../../settings/InlineEdit'
import { parseMcpResponse } from '../../../../utils/mcpResponse'
import type { ToolAccordionProps } from './toolAccordionProps.interface'


export function ToolAccordion({ tool: initialTool, projectId, mcpServerIdentifier, anyApiKey, onToolChanged, onEditEndpoint }: ToolAccordionProps) {
  const { t } = useTranslation('serverDetail')
  const [tool, setTool] = useState(initialTool)
  const [curlCopied, setCurlCopied] = useState(false)
  const [mcpCurlCopied, setMcpCurlCopied] = useState(false)
  const { can } = useAuth()
  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)

  // Sync when parent updates the tool (e.g. after dialog save)
  useEffect(() => { setTool(initialTool) }, [initialTool])

  const method = tool.endpointRef?.method ?? 'DATA'
  const path = tool.endpointRef?.path ?? t('tab.operations')
  const parameterMap = tool.endpointRef?.parameterMap ?? Object.keys(tool.inputSchema.properties ?? {}).map((name) => ({
    toolParamName: name, originalName: name, source: 'argument' as const, required: tool.inputSchema.required?.includes(name) ?? false,
  }))
  const properties = tool.inputSchema.properties ?? {}
  const requiredFields = tool.inputSchema.required ?? []
  const allParams = parameterMap ?? []
  const paramEntries = Object.entries(properties)
  const curl = tool.endpointRef ? buildCurl(tool as GeneratedTool & { endpointRef: NonNullable<GeneratedTool['endpointRef']> }) : ''
  const mcpCurl = buildMcpCurl(tool, mcpServerIdentifier, !!anyApiKey)

  const saveToolMeta = async (field: 'name' | 'description', newValue: string) => {
    const oldName = tool.name
    await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(oldName)}`, { [field]: newValue })
    const updated = { ...tool, [field]: newValue }
    setTool(updated)
    onToolChanged(oldName, updated)
  }

  const isDisabled = tool.enabled === false

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newEnabled = isDisabled
    const oldName = tool.name
    await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(oldName)}`, { enabled: newEnabled })
    const updated = { ...tool, enabled: newEnabled }
    setTool(updated)
    onToolChanged(oldName, updated)
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
      if (anyApiKey) headers['auth'] = anyApiKey
      const res = await api.post(`/mcp/server/${mcpServerIdentifier}`, payload, { headers })
      const rpc = parseMcpResponse(res.data)
      if (rpc?.error) { setResponse(JSON.stringify(rpc.error, null, 2)); setResponseIsError(true); return }
      const content = rpc?.result?.content ?? rpc?.content
      if (rpc?.result?.isError ?? rpc?.isError) setResponseIsError(true)
      const text = content?.[0]?.text ?? JSON.stringify(rpc?.result ?? rpc, null, 2)
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)) } catch { setResponse(text) }
    } catch (err: any) {
      setResponse(err?.response?.data?.message ?? err?.message ?? t('error.requestFailed'))
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{
      mb: '6px', '&:before': { display: 'none' },
      borderColor: isDisabled ? 'divider' : `${METHOD_COLOR[method] ?? '#ddd'}33`,
      '&.Mui-expanded': { borderColor: isDisabled ? '#ccc' : `${METHOD_COLOR[method] ?? '#ddd'}88` },
      opacity: isDisabled ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <AccordionSummary expandIcon={<IconChevronDown />} sx={{
        bgcolor: isDisabled ? 'action.hover' : METHOD_BG[method] ?? 'background.paper',
        borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', px: 2,
        filter: isDisabled ? 'grayscale(0.5)' : 'none',
      }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
          {/* Method badge */}
          <Box sx={{
            px: 1.2, py: 0.4, borderRadius: '4px',
            bgcolor: METHOD_COLOR[method] ?? '#888', color: '#fff',
            fontWeight: 700, fontSize: '0.72rem', fontFamily: 'monospace',
            minWidth: 58, textAlign: 'center', flexShrink: 0,
          }}>
            {method}
          </Box>

          {/* Tool name — editable */}
          <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0, maxWidth: { xs: '45%', sm: '60%' }, flexShrink: 1 }}>
            <InlineEdit value={tool.name} onSave={(v) => saveToolMeta('name', v)}
              readOnly={!can(Permission.ToolsEdit)} placeholder={t('placeholder.toolName')} fontSize="0.875rem" fontWeight={700} maxWidth="100%" />
          </Box>

          {/* Disabled chip */}
          {isDisabled && (
            <Chip label={t('label.disabled')} size="small"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#9e9e9e', color: '#fff', flexShrink: 0 }} />
          )}

          {/* HTML template chip */}
          {tool.outputTemplate && !isDisabled && (
            <Chip label={t('label.htmlChip')} size="small"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'warning.main', color: '#fff', flexShrink: 0 }} />
          )}

          {/* Path — read only */}
          <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap flexGrow={1}>{path}</Typography>

          {/* Toggle enable/disable */}
          {tool.endpointRef && can(Permission.ToolsEdit) && (
            <Tooltip title={isDisabled ? t('tooltip.enableTool') : t('tooltip.disableTool')}>
              <Switch
                size="small"
                checked={!isDisabled}
                onClick={handleToggle}
                sx={{ flexShrink: 0 }}
              />
            </Tooltip>
          )}

          {/* Edit endpoint button */}
          {can(Permission.ToolsEdit) && (
            <Tooltip title={t('action.editEndpoint')}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditEndpoint(tool) }}
                sx={{ flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          )}

        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {/* Description — editable */}
        <Box mb={2}>
          <InlineEdit value={tool.description ?? ''} onSave={(v) => saveToolMeta('description', v)}
            readOnly={!can(Permission.ToolsEdit)} multiline placeholder={t('placeholder.addDescription')}
            emptyLabel={t('placeholder.addDescription')} fontSize="0.875rem" color="text.secondary" />
        </Box>

        {/* Parameters table */}
        {allParams.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('heading.parameters')}</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2 }}>
              <Table size="small" sx={{ minWidth: 480, '& td': { fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common:label.name')}</TableCell>
                    <TableCell>{t('schema.column')}</TableCell>
                    <TableCell>{t('schema.type')}</TableCell>
                    <TableCell>{t('label.required')}</TableCell>
                    <TableCell>{t('common:label.description')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allParams.map((p) => {
                    const schema = properties[p.toolParamName] ?? {}
                    const isReq = p.required || requiredFields.includes(p.toolParamName)
                    return (
                      <TableRow key={p.toolParamName} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{p.toolParamName}</Typography></TableCell>
                        <TableCell>
                          <Chip label={p.source} size="small" color={SOURCE_CHIP_COLOR[p.source] ?? 'default'}
                            sx={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, height: 20 }} />
                        </TableCell>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.75rem" color="text.secondary">{schema.type ?? 'string'}</Typography></TableCell>
                        <TableCell>
                          {isReq
                            ? <Typography color="error.main" fontSize="0.72rem" fontWeight={700}>{t('label.required')}</Typography>
                            : <Typography color="text.disabled" fontSize="0.72rem">{t('label.optional')}</Typography>}
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>{t('action.try')}</Typography>
          {can(Permission.ToolsTest) && (
            <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
              onClick={() => { setTryMode((v) => !v); setResponse(null) }}
              sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
              {tryMode ? t('common:action.cancel') : t('action.try')}
            </Button>
          )}
        </Box>

        {tryMode && (
          <Box>
            {paramEntries.length > 0
              ? <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
                  {paramEntries.map(([name, schema]) => (
                    <FieldInput key={name} name={name} schema={schema}
                      value={formValues[name] ?? ''} required={requiredFields.includes(name)}
                      onChange={(v) => setFormValues((prev) => ({ ...prev, [name]: v }))} />
                  ))}
                </Box>
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>{t('label.noParameters')}</Typography>}

            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={18} />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? t('action.executing') : t('action.execute')}
            </Button>

            {response !== null && (
              <>
                <Box component="pre" sx={{
                  bgcolor: responseIsError ? 'error.light' : '#1e1e1e',
                  color: responseIsError ? 'error.dark' : '#d4d4d4',
                  border: '1px solid', borderColor: responseIsError ? 'error.light' : 'transparent',
                  p: 2, borderRadius: 1, fontSize: '0.78rem',
                  overflowX: 'auto', overflowY: 'auto', maxHeight: 400,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, mb: 1,
                }}>
                  {response}
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Notes / comments */}
        <Divider sx={{ my: 2 }} />
        <ToolCommentsSection projectId={projectId} toolName={tool.name} initialComments={tool.comments ?? []} />

        {/* Examples */}
        {!tryMode && (
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            {/* Direct curl */}
            {tool.endpointRef && <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('heading.directApiCurl')}</Typography>
              <Box component="pre" sx={{
                bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={curlCopied ? t('tooltip.copiedBang') : t('common:action.copy')}>
                  <IconButton size="small"
                    onClick={() => { navigator.clipboard.writeText(curl); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000) }}
                    sx={{ position: 'absolute', top: 8, right: 8, color: curlCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                    <IconCopy size={15} />
                  </IconButton>
                </Tooltip>
                {curl}
              </Box>
            </Box>}

            {/* MCP via POST */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('heading.mcpCallPost')}</Typography>
              <Box component="pre" sx={{
                bgcolor: '#282c34', color: '#abb2bf', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={mcpCurlCopied ? t('tooltip.copiedBang') : t('common:action.copy')}>
                  <IconButton size="small"
                    onClick={() => { navigator.clipboard.writeText(mcpCurl); setMcpCurlCopied(true); setTimeout(() => setMcpCurlCopied(false), 2000) }}
                    sx={{ position: 'absolute', top: 8, right: 8, color: mcpCurlCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                    <IconCopy size={15} />
                  </IconButton>
                </Tooltip>
                {mcpCurl}
              </Box>
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
