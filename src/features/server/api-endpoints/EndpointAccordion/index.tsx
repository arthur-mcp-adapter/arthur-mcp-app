import { useEffect, useState } from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Chip, CircularProgress, Divider,
  IconButton, Table, TableBody, TableCell, TableHead,
  TableRow, Tooltip, Typography,
} from '@mui/material'
import {
  IconChevronDown, IconEdit, IconPlayerPlay,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../../../context/AuthContext'
import api from '../../../../api'
import type { EndpointRef, GeneratedTool } from '../../types'
import { METHOD_COLOR, METHOD_BG, SOURCE_CHIP_COLOR } from '../../constants'
import { inferSchema } from '../curl-utils'
import { FieldInput } from '../../resources/DynamicResourceDialog'

function parseMcpResponse(data: unknown): any {
  if (typeof data === 'object' && data !== null) return data
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) { try { return JSON.parse(match[1]) } catch { /* fall through */ } }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}

export function EndpointAccordion({ endpoint, projectId, anyApiKey, canTest, onEdit, onToolChanged }: {
  endpoint: { tool: GeneratedTool } & EndpointRef
  projectId: string
  anyApiKey?: string
  canTest: boolean
  onEdit?: () => void
  onToolChanged?: (oldName: string, newTool: GeneratedTool) => void
}) {
  const { t } = useTranslation('serverDetail')
  const method = endpoint.method.toUpperCase()
  const parameterMap = endpoint.parameterMap ?? []
  const [tool, setTool] = useState(endpoint.tool)
  const properties = tool.inputSchema?.properties ?? {}
  const requiredFields = tool.inputSchema?.required ?? []
  const paramEntries = Object.entries(properties)

  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [savingSchema, setSavingSchema] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)

  const { can } = useAuth()

  useEffect(() => { setTool(endpoint.tool) }, [endpoint.tool])

  const handleExecute = async () => {
    setExecuting(true); setResponse(null); setResponseIsError(false)
    try {
      const args: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(formValues)) {
        if (val === '') continue
        const schema = properties[key] as any
        if (schema?.type === 'number' || schema?.type === 'integer') args[key] = Number(val)
        else if (schema?.type === 'boolean') args[key] = val === 'true'
        else if (schema?.type === 'object' || schema?.type === 'array') {
          try { args[key] = JSON.parse(val) } catch { args[key] = val }
        } else args[key] = val
      }
      const payload = { jsonrpc: '2.0', method: 'tools/call', id: Date.now(), params: { name: endpoint.tool.name, arguments: args } }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (anyApiKey) headers['auth'] = anyApiKey
      const res = await api.post(`/mcp/server/${projectId}`, payload, { headers })
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

  const queryParams = parameterMap.filter((p) => p.source === 'query')
  const pathParams = parameterMap.filter((p) => p.source === 'path')
  const bodyParams = parameterMap.filter((p) => p.source === 'body')
  const headerParams = parameterMap.filter((p) => p.source === 'header')

  return (
    <Accordion variant="outlined" sx={{
      mb: 0, '&:before': { display: 'none' },
      borderColor: `${METHOD_COLOR[method] ?? '#ddd'}44`,
      '&.Mui-expanded': { borderColor: `${METHOD_COLOR[method] ?? '#ddd'}88` },
      transition: 'border-color 0.15s',
    }}>
      <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{
        bgcolor: METHOD_BG[method] ?? 'background.paper',
        borderRadius: '7px 7px 0 0',
        minHeight: '48px !important', px: 2,
        '&.Mui-expanded': { minHeight: '48px !important' },
      }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
          <Box sx={{
            px: 1.2, py: 0.35, borderRadius: '4px',
            bgcolor: METHOD_COLOR[method] ?? '#888', color: '#fff',
            fontWeight: 700, fontSize: '0.72rem', fontFamily: 'monospace',
            minWidth: 58, textAlign: 'center', flexShrink: 0,
          }}>
            {method}
          </Box>
          <Typography fontFamily="monospace" fontWeight={600} fontSize="0.875rem" flexGrow={1} minWidth={0} noWrap>
            {endpoint.path}
          </Typography>
          <Box display="flex" gap={0.5} flexShrink={0} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {pathParams.length > 0 && <Chip label={`${pathParams.length} path`} size="small" color="warning" sx={{ fontSize: '0.62rem', height: 17 }} />}
            {queryParams.length > 0 && <Chip label={`${queryParams.length} query`} size="small" color="info" sx={{ fontSize: '0.62rem', height: 17 }} />}
            {bodyParams.length > 0 && <Chip label={`${bodyParams.length} body`} size="small" color="secondary" sx={{ fontSize: '0.62rem', height: 17 }} />}
            {headerParams.length > 0 && <Chip label={`${headerParams.length} header`} size="small" sx={{ fontSize: '0.62rem', height: 17 }} />}
          </Box>
          <Chip label={endpoint.tool.name} size="small"
            sx={{ fontFamily: 'monospace', fontSize: '0.68rem', height: 20, bgcolor: 'action.hover', flexShrink: 0, display: { xs: 'none', md: 'flex' } }} />
          {onEdit && (
            <Tooltip title={t('action.editEndpoint')}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit() }}
                sx={{ flexShrink: 0, ml: 0.5 }}>
                <IconEdit size={15} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {/* Full URL + description */}
        <Typography variant="caption" color="text.disabled" fontFamily="monospace" display="block" mb={endpoint.tool.description ? 0.75 : 0}
          sx={{ wordBreak: 'break-all' }}>
          {endpoint.baseUrl}{endpoint.path}
        </Typography>
        {endpoint.tool.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {endpoint.tool.description.replace(/\s*\[.*?\]\s*$/, '')}
          </Typography>
        )}

        {/* Parameters table */}
        {paramEntries.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('heading.parameters')}</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
              <Table size="small" sx={{
                minWidth: 460,
                '& th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem', verticalAlign: 'middle' },
              }}>
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
                  {paramEntries.map(([name, schema]: [string, any]) => {
                    const mapping = parameterMap.find((pm) => pm.toolParamName === name)
                    const isReq = requiredFields.includes(name) || (mapping?.required ?? false)
                    return (
                      <TableRow key={name} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{name}</Typography></TableCell>
                        <TableCell>
                          <Chip label={mapping?.source ?? 'query'} size="small"
                            color={SOURCE_CHIP_COLOR[mapping?.source ?? 'query'] ?? 'default'}
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode && paramEntries.length ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>{t('heading.tryItOut')}</Typography>
          {canTest && (
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
                  {paramEntries.map(([name, schema]: [string, any]) => (
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
                {!responseIsError && (() => {
                  let parsed: unknown = null
                  try { parsed = JSON.parse(response) } catch { /* not JSON */ }
                  if (parsed === null) return null
                  return can(Permission.ToolsEdit) ? (
                    <Button size="small" variant="outlined" disabled={savingSchema}
                      startIcon={savingSchema ? <CircularProgress size={12} color="inherit" /> : undefined}
                      onClick={async () => {
                        setSavingSchema(true)
                        try {
                          const schema = inferSchema(parsed)
                          await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(tool.name)}/output-schema`, { outputSchema: schema })
                          const updated = { ...tool, outputSchema: schema }
                          setTool(updated)
                          onToolChanged?.(tool.name, updated)
                        } finally { setSavingSchema(false) }
                      }}>
                      {savingSchema ? t('status.saving') : t('action.useAsOutputSchema')}
                    </Button>
                  ) : null
                })()}
              </>
            )}
          </Box>
        )}

        {/* Output Schema */}
        <Divider sx={{ my: 2 }} />
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={schemaOpen ? 1.5 : 0}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={700}>{t('heading.outputSchema')}</Typography>
            {tool.outputSchema
              ? <Chip label={t('label.schemaConfigured')} size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />
              : <Chip label={t('label.schemaNone')} size="small" sx={{ fontSize: '0.65rem', height: 18, opacity: 0.5 }} />}
          </Box>
          <Box display="flex" gap={0.5}>
            {tool.outputSchema && can(Permission.ToolsEdit) && (
              <Button size="small" color="error" disabled={savingSchema}
                onClick={async () => {
                  setSavingSchema(true)
                  try {
                    await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(tool.name)}/output-schema`, { outputSchema: null })
                    const updated = { ...tool, outputSchema: undefined }
                    setTool(updated)
                    onToolChanged?.(tool.name, updated)
                    setSchemaOpen(false)
                  } finally { setSavingSchema(false) }
                }}>
                {t('common:action.clear')}
              </Button>
            )}
            {tool.outputSchema && (
              <Button size="small" onClick={() => setSchemaOpen((v) => !v)}>
                {schemaOpen ? t('common:action.hide') : t('common:action.show')}
              </Button>
            )}
          </Box>
        </Box>
        {schemaOpen && tool.outputSchema && (
          <Box component="pre" sx={{
            bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
            fontSize: '0.75rem', overflowX: 'auto', maxHeight: 300,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, mb: 2,
          }}>
            {JSON.stringify(tool.outputSchema, null, 2)}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
