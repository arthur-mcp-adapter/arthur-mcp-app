import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Grid, IconButton, MenuItem, Paper, Select, Switch,
  TextField, Typography,
} from '@mui/material'
import { IconDatabase, IconEdit, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { BaseDialogLayout } from '../../../components'
import type { DbConnectionConfig, DbQuery, DbQueryParameter } from '../types'

interface OperationsTabProps {
  projectId: string
  sourceType: string
  initialConnection?: DbConnectionConfig
  initialOperations?: DbQuery[]
  onChange: (connection: DbConnectionConfig, operations: DbQuery[]) => void
}

const DEFAULT_PORT: Record<string, number> = { postgresql: 5432, mysql: 3306, mariadb: 3306 }
const EMPTY_OPERATION: Omit<DbQuery, 'id'> = {
  name: '', description: '', sourceType: 'postgresql', query: '', resultMode: 'rows', parameters: [],
}

function schemaFrom(parameters: DbQueryParameter[]) {
  return {
    type: 'object',
    properties: Object.fromEntries(parameters.filter((p) => p.name.trim()).map((p) => [p.name.trim(), {
      type: p.type, ...(p.description?.trim() ? { description: p.description.trim() } : {}),
    }])),
    required: parameters.filter((p) => p.required && p.name.trim()).map((p) => p.name.trim()),
  }
}

export function OperationsTab({ projectId, sourceType, initialConnection, initialOperations = [], onChange }: OperationsTabProps) {
  const { t } = useTranslation('serverDetail')
  const [connection, setConnection] = useState<DbConnectionConfig>({ port: DEFAULT_PORT[sourceType], ...initialConnection })
  const [operations, setOperations] = useState(initialOperations)
  const [savingConnection, setSavingConnection] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [schema, setSchema] = useState<unknown>(null)
  const [introspecting, setIntrospecting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DbQuery | null>(null)
  const [draft, setDraft] = useState<Omit<DbQuery, 'id'>>(EMPTY_OPERATION)
  const [savingOperation, setSavingOperation] = useState(false)
  const [testArgs, setTestArgs] = useState('{}')
  const [testResult, setTestResult] = useState('')
  const [testingOperation, setTestingOperation] = useState(false)
  const [error, setError] = useState('')

  const saveConnection = async () => {
    setSavingConnection(true); setError(''); setConnectionResult(null)
    try {
      await api.patch(`/swagger/servers/${projectId}/connection`, connection)
      onChange(connection, operations)
      setConnectionResult({ ok: true, message: t('operations.connectionSaved') })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('operations.connectionSaveFailed'))
    } finally { setSavingConnection(false) }
  }

  const testConnection = async () => {
    setTestingConnection(true); setError(''); setConnectionResult(null)
    try {
      await api.patch(`/swagger/servers/${projectId}/connection`, connection)
      const { data } = await api.post<{ ok: boolean; latencyMs?: number; error?: string }>(`/swagger/servers/${projectId}/test-db-connection`)
      setConnectionResult(data.ok
        ? { ok: true, message: t('status.connected', { latencyMs: data.latencyMs ?? 0 }) }
        : { ok: false, message: t('status.connectionFailed', { error: data.error }) })
      if (data.ok) onChange(connection, operations)
    } catch (err: any) {
      setConnectionResult({ ok: false, message: err?.response?.data?.message ?? t('error.connectionFailed') })
    } finally { setTestingConnection(false) }
  }

  const introspect = async () => {
    setIntrospecting(true); setError('')
    try {
      await api.patch(`/swagger/servers/${projectId}/connection`, connection)
      const { data } = await api.post(`/swagger/servers/${projectId}/introspect`)
      setSchema(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('error.introspectFailed'))
    } finally { setIntrospecting(false) }
  }

  const openNew = () => {
    setEditing(null); setDraft({ ...EMPTY_OPERATION, sourceType, parameters: [] }); setTestArgs('{}'); setTestResult(''); setError(''); setDialogOpen(true)
  }
  const openEdit = (operation: DbQuery) => {
    setEditing(operation); setDraft({ ...operation, parameters: operation.parameters ?? [] }); setTestArgs('{}'); setTestResult(''); setError(''); setDialogOpen(true)
  }

  const saveOperation = async () => {
    setSavingOperation(true); setError('')
    try {
      const payload = { ...draft, name: draft.name.trim(), description: draft.description?.trim(), query: draft.query?.trim(), inputSchema: schemaFrom(draft.parameters ?? []) }
      const { data } = editing
        ? await api.put<DbQuery>(`/swagger/servers/${projectId}/queries/${editing.id}`, payload)
        : await api.post<DbQuery>(`/swagger/servers/${projectId}/queries`, payload)
      const next = editing ? operations.map((item) => item.id === editing.id ? data : item) : [...operations, data]
      setOperations(next); onChange(connection, next); setDialogOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('operations.operationSaveFailed'))
    } finally { setSavingOperation(false) }
  }

  const deleteOperation = async (operation: DbQuery) => {
    if (!window.confirm(t('operations.deleteConfirm', { name: operation.name }))) return
    setError('')
    try {
      await api.delete(`/swagger/servers/${projectId}/queries/${operation.id}`)
      const next = operations.filter((item) => item.id !== operation.id)
      setOperations(next); onChange(connection, next)
    } catch (err: any) { setError(err?.response?.data?.message ?? t('operations.operationDeleteFailed')) }
  }

  const runOperation = async () => {
    setTestingOperation(true); setError(''); setTestResult('')
    try {
      const args = JSON.parse(testArgs || '{}')
      const payload = { ...draft, id: editing?.id ?? 'inline-test', inputSchema: schemaFrom(draft.parameters ?? []) }
      const { data } = editing
        ? await api.post(`/swagger/servers/${projectId}/queries/${editing.id}/run`, { args })
        : await api.post(`/swagger/servers/${projectId}/run-query-inline`, { query: payload, args })
      setTestResult(JSON.stringify(data.error ? { error: data.error } : data.result, null, 2))
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err?.response?.data?.message ?? err.message }, null, 2))
    } finally { setTestingOperation(false) }
  }

  const updateParameter = (index: number, patch: Partial<DbQueryParameter>) => {
    const parameters = [...(draft.parameters ?? [])]
    parameters[index] = { ...parameters[index], ...patch }
    setDraft({ ...draft, parameters })
  }

  return <Box display="flex" flexDirection="column" gap={2.5}>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box><Typography variant="h6" fontWeight={700}>{t('operations.connectionTitle')}</Typography><Typography variant="body2" color="text.secondary">{t('operations.connectionDescription')}</Typography></Box>
        <Chip icon={<IconDatabase size={16} />} label={sourceType} variant="outlined" />
      </Box>
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={8}><TextField fullWidth size="small" label={t('operations.host')} value={connection.host ?? ''} onChange={(e) => setConnection({ ...connection, host: e.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label={t('operations.port')} value={connection.port ?? ''} onChange={(e) => setConnection({ ...connection, port: Number(e.target.value) })} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label={t('operations.database')} value={connection.database ?? ''} onChange={(e) => setConnection({ ...connection, database: e.target.value })} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label={t('operations.user')} value={connection.user ?? ''} onChange={(e) => setConnection({ ...connection, user: e.target.value })} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" type="password" label={t('operations.passwordOrSecret')} value={connection.password ?? ''} onChange={(e) => setConnection({ ...connection, password: e.target.value })} helperText={t('operations.secretHint')} /></Grid>
      </Grid>
      <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={connection.ssl ?? false} onChange={(e) => setConnection({ ...connection, ssl: e.target.checked })} />} label={t('operations.ssl')} />
      <Box display="flex" gap={1} mt={1} flexWrap="wrap">
        <Button variant="contained" onClick={saveConnection} disabled={savingConnection}>{savingConnection ? <CircularProgress size={18} /> : t('operations.saveConnection')}</Button>
        <Button variant="outlined" onClick={testConnection} disabled={testingConnection}>{testingConnection ? t('action.testing') : t('action.testConnection')}</Button>
        <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={introspect} disabled={introspecting}>{introspecting ? t('action.introspecting') : t('action.introspectSchema')}</Button>
      </Box>
      {connectionResult && <Alert severity={connectionResult.ok ? 'success' : 'error'} sx={{ mt: 2 }}>{connectionResult.message}</Alert>}
      {schema !== null && <Box component="pre" sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(schema, null, 2)}</Box>}
    </Paper>

    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box><Typography variant="h6" fontWeight={700}>{t('tab.operations')}</Typography><Typography variant="body2" color="text.secondary">{t('operations.listDescription')}</Typography></Box>
        <Button variant="contained" size="small" startIcon={<IconPlus size={16} />} onClick={openNew}>{t('operations.newOperation')}</Button>
      </Box>
      {!operations.length ? <Alert severity="info">{t('operations.empty')}</Alert> : operations.map((operation) => <Paper key={operation.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
          <Box minWidth={0}><Typography fontWeight={700}>{operation.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{operation.description || operation.query}</Typography></Box>
          <Box><IconButton aria-label={t('operations.editOperation')} onClick={() => openEdit(operation)}><IconEdit size={18} /></IconButton><IconButton color="error" aria-label={t('operations.deleteOperation')} onClick={() => deleteOperation(operation)}><IconTrash size={18} /></IconButton></Box>
        </Box>
      </Paper>)}
    </Paper>

    <BaseDialogLayout
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      title={editing ? t('operations.editOperation') : t('operations.newOperation')}
      titleIcon={<IconDatabase size={20} />}
      description={t('operations.editorDescription')}
      width={720}
      footer={<>
        <Button onClick={() => setDialogOpen(false)}>{t('action.cancel', { ns: 'common' })}</Button>
        <Button variant="contained" onClick={saveOperation} disabled={savingOperation || !draft.name.trim() || !draft.query?.trim()}>{savingOperation ? t('status.saving') : t('action.save', { ns: 'common' })}</Button>
      </>}
    >
      <Box display="flex" flexDirection="column" gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField autoFocus required label={t('operations.name')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label={t('operations.description')} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Box><Typography fontWeight={700} mb={1}>{t('heading.parameters')}</Typography>{(draft.parameters ?? []).map((parameter, index) => <Grid container spacing={1} key={index} mb={1}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label={t('operations.parameterName')} value={parameter.name} onChange={(e) => updateParameter(index, { name: e.target.value })} /></Grid>
          <Grid item xs={12} md={2}><Select fullWidth size="small" value={parameter.type} onChange={(e) => updateParameter(index, { type: e.target.value as DbQueryParameter['type'] })}>{['string','number','boolean','array','object'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</Select></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label={t('operations.parameterDescription')} value={parameter.description} onChange={(e) => updateParameter(index, { description: e.target.value })} /></Grid>
          <Grid item xs={9} md={2}><FormControlLabel control={<Switch checked={parameter.required ?? false} onChange={(e) => updateParameter(index, { required: e.target.checked })} />} label={t('label.required')} /></Grid>
          <Grid item xs={3} md={1}><IconButton color="error" onClick={() => setDraft({ ...draft, parameters: (draft.parameters ?? []).filter((_, i) => i !== index) })}><IconTrash size={17} /></IconButton></Grid>
        </Grid>)}<Button size="small" startIcon={<IconPlus size={15} />} onClick={() => setDraft({ ...draft, parameters: [...(draft.parameters ?? []), { name: '', type: 'string', required: false, description: '' }] })}>{t('action.addParameter')}</Button></Box>
        <TextField label={t('operations.sql')} multiline minRows={6} value={draft.query ?? ''} onChange={(e) => setDraft({ ...draft, query: e.target.value })} helperText={t('description.sqlParamSyntax')} />
        <Box><Typography variant="body2" mb={0.5}>{t('operations.resultMode')}</Typography><Select size="small" value={draft.resultMode ?? 'rows'} onChange={(e) => setDraft({ ...draft, resultMode: e.target.value as DbQuery['resultMode'] })}>{['rows','first','count'].map((mode) => <MenuItem key={mode} value={mode}>{t(`operations.resultModes.${mode}`)}</MenuItem>)}</Select></Box>
        <TextField label={t('operations.testArgs')} multiline minRows={3} value={testArgs} onChange={(e) => setTestArgs(e.target.value)} helperText={t('operations.testArgsHint')} />
        <Button variant="outlined" onClick={runOperation} disabled={testingOperation || !draft.query?.trim()}>{testingOperation ? t('action.executing') : t('operations.testOperation')}</Button>
        {testResult && <Box component="pre" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto', fontSize: 12 }}>{testResult}</Box>}
      </Box>
    </BaseDialogLayout>
  </Box>
}
