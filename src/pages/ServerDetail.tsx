import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getSourceType, isDbSource, isSqlSource, isNoSqlSource, isBlankSource,
  SOURCE_DISPLAY, SourceType, SQL_SOURCES, NOSQL_SOURCES,
} from '../utils/sourceType'
import Handlebars from 'handlebars'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Divider,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconCopy,
  IconTrash,
  IconEdit,
  IconChevronDown,
  IconFile,
  IconTool,
  IconWorld,
  IconBook,
  IconChartBar,
  IconKey,
  IconPlayerPlay,
  IconPlayerPause,
  IconBell,
  IconClock,
  IconAdjustments,
  IconSearch,
  IconEye,
  IconEyeOff,
  IconDatabase,
  IconBulb,
  IconRoute,
  IconArrowsShuffle,
  IconShieldLock,
  IconChevronUp,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconExternalLink,
  IconLink,
  IconTable,
  IconColumns,
  IconChevronRight,
} from '@tabler/icons-react'
import MonacoEditor from '@monaco-editor/react'
import { useColorMode } from '../theme/ColorModeContext'
import { useAuth, Permission } from '../context/AuthContext'
import { useServerNav, type ServerNavItem } from '../context/ServerNavContext'
import api from '../api'
import HelpButton from '../components/HelpButton'
import ConfirmDialog from '../components/ConfirmDialog'
import { McpDocsContent } from './McpDocs'
import SecretAutocomplete, { SecretEntry, useSecrets } from '../components/SecretAutocomplete'
import { SaveIndicator } from '../components/SaveIndicator'
import { ProjectLogs } from '../features/server/activity/ProjectLogs'
import { EndpointAccordion } from '../features/server/api-endpoints/EndpointAccordion'
import { FieldInput } from '../features/server/api-endpoints/FieldInput'
import { FromEndpointPickerDialog } from '../features/server/api-endpoints/FromEndpointPickerDialog'
import { ReimportSpecDialog } from '../features/server/api-endpoints/ReimportSpecDialog'
import { ToolCommentsSection } from '../features/server/api-endpoints/ToolCommentsSection'
import { buildCurl, buildMcpCurl, inferSchema } from '../features/server/api-endpoints/curl-utils'
import { ApiKeysPanel } from '../features/server/connect/ApiKeysPanel'
import { McpEndpointBar } from '../features/server/connect/McpEndpointBar'
import { OAuthClientPanel } from '../features/server/connect/OAuthClientPanel'
import { AuthConfigPanel } from '../features/server/settings/AuthConfigPanel'
import { BaseUrlPanel } from '../features/server/settings/BaseUrlPanel'
import { ProjectControlsPanel } from '../features/server/settings/ProjectControlsPanel'
import { RateLimitPanel } from '../features/server/settings/RateLimitPanel'
import type { AuthConfig, SaveStatus } from '../features/server/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParameterMapping {
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
}

interface EndpointRef {
  method: string
  path: string
  baseUrl: string
  contentType?: string
  parameterMap: ParameterMapping[]
}

interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  description?: string
  enum?: unknown[]
}

interface ToolComment {
  id: string
  text: string
  author: string
  createdAt: string
}

interface ExecutionRef {
  type: 'sql' | 'mongodb' | 'redis' | 'elasticsearch' | 'dynamodb' | 'firestore' | 'db' | 'static'
  dialect?: string
  query?: string
  paramStyle?: string
  resultMode?: string
  collection?: string
  operation?: string
  filterTemplate?: string
  projectionTemplate?: string
  pipeline?: unknown[]
  documentTemplate?: string
  command?: string
  keyPattern?: string
  valueTemplate?: string
  dbQueryId?: string
  responseTemplate?: string
  mimeType?: string
}

interface DbQueryParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required?: boolean
  description?: string
  default?: unknown
}

interface DbQuery {
  id: string
  name: string
  description?: string
  sourceType: string
  query?: string
  resultMode?: 'rows' | 'first' | 'count'
  collection?: string
  operationType?: 'find' | 'findOne' | 'insertOne' | 'updateOne' | 'deleteOne' | 'aggregate' | 'count'
  filterTemplate?: string
  projectionTemplate?: string
  updateTemplate?: string
  pipeline?: string
  sortTemplate?: string
  limitValue?: number
  command?: string
  keyPattern?: string
  valueTemplate?: string
  redisTemplate?: 'exact_key' | 'key_prefix' | 'key_range' | 'search_by_value' | 'secondary_index' | 'full_text' | 'composite'
  valuePattern?: string
  keyPrefixFilter?: string
  redisMinScore?: string
  redisMaxScore?: string
  redisLimit?: number
  redisFtIndex?: string
  redisFetchValues?: boolean
  tableName?: string
  dynamoOperation?: string
  esIndex?: string
  esOperation?: string
  esBodyTemplate?: string
  gqlDocument?: string
  gqlOperationType?: 'query' | 'mutation'
  grpcService?: string
  grpcMethod?: string
  grpcRequestTemplate?: string
  parameters?: DbQueryParameter[]
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  iteratorPath?: string
}

interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  outputTemplate?: string
  errorConfig?: { message: string }
  endpointRef?: EndpointRef
  executionRef?: ExecutionRef
  endpointSource?: string
  enabled?: boolean
  comments?: ToolComment[]
}

interface McpApiKeyEntry {
  id: string
  name: string
  key: string
  createdAt: string
}

interface McpResource {
  id: string
  name: string
  uri: string
  description?: string
  mimeType?: string
  content: string
  editorData?: string
  type?: 'static' | 'dynamic'
  endpointRef?: EndpointRef
  endpointSource?: string
  inputDefaults?: Record<string, unknown>
  iteratorPath?: string
  errorConfig?: { message: string }
  enabled?: boolean
}

interface McpPrompt {
  promptId: string
  enabled?: boolean
}

type ChainInputSource =
  | { source: 'literal'; value: string }
  | { source: 'chain_input'; paramName: string }
  | { source: 'step_output'; stepId: string; jsonPath: string }

interface ChainInputMapping {
  paramName: string
  input: ChainInputSource
}

interface ChainStep {
  id: string
  toolName: string
  inputMapping: ChainInputMapping[]
}

interface ToolChain {
  id: string
  name: string
  description?: string
  inputSchema: JsonSchema
  steps: ChainStep[]
  enabled?: boolean
}


interface GlobalPrompt {
  id: string
  name: string
  description?: string
  content: string
  tags: string[]
}

interface Project {
  _id: string
  name: string
  baseUrl: string
  description?: string
  version?: string
  status: string
  isPaused?: boolean
  maintenanceMode?: { enabled: boolean; message: string }
  availabilityWindow?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  alertConfig?: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }
  tools: GeneratedTool[]
  resources?: McpResource[]
  prompts?: McpPrompt[]
  chains?: ToolChain[]
  dbQueries?: DbQuery[]
  mcpApiKey?: string
  mcpApiKeys?: McpApiKeyEntry[]
  oauthClientId?: string
  oauthClientSecret?: string
  rateLimit?: { enabled: boolean; requestsPerMinute: number }
  auth?: AuthConfig
  tags?: string[]
  connectionConfig?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
}

const METHOD_BG: Record<string, string> = {
  GET: 'rgba(97,175,254,0.12)',
  POST: 'rgba(73,204,144,0.12)',
  PUT: 'rgba(252,161,48,0.12)',
  PATCH: 'rgba(80,227,194,0.12)',
  DELETE: 'rgba(249,62,62,0.12)',
}

const SOURCE_CHIP_COLOR: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  path: 'secondary',
  query: 'primary',
  body: 'success',
  header: 'warning',
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const SOURCES = ['path', 'query', 'body', 'header'] as const
const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array']

// ─── MCP response parser ──────────────────────────────────────────────────────

function parseMcpResponse(data: unknown): any {
  if (typeof data === 'object' && data !== null) return data
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) { try { return JSON.parse(match[1]) } catch { /* fall through */ } }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}

// ─── InlineEdit ───────────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (v: string) => Promise<void>
  readOnly?: boolean
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  fontSize?: string | number
  fontWeight?: number
  color?: string
  fontFamily?: string
  maxWidth?: number | string
}

function InlineEdit({
  value,
  onSave,
  readOnly = false,
  multiline = false,
  placeholder,
  emptyLabel = 'Add…',
  fontSize,
  fontWeight,
  color,
  fontFamily,
  maxWidth,
}: InlineEditProps) {
  const { t } = useTranslation('serverDetail')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = async () => {
    if (saving) return
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  const cancel = () => { setDraft(value); setEditing(false) }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { cancel(); return }
    if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); return }
    if (multiline && e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commit(); return }
  }

  if (!editing) {
    if (readOnly) {
      return (
        <Typography sx={{ fontSize, fontWeight, color: value ? (color ?? 'text.primary') : 'text.disabled', fontFamily, lineHeight: 1.5, fontStyle: value ? 'normal' : 'italic', maxWidth }}>
          {value || emptyLabel}
        </Typography>
      )
    }
    return (
      <Box
        display="inline-flex"
        alignItems="flex-start"
        gap={0.5}
        onClick={() => setEditing(true)}
        sx={{
          cursor: 'text',
          maxWidth,
          borderBottom: '1px dashed transparent',
          transition: 'border-color 0.15s',
          '&:hover': {
            borderColor: 'divider',
            cursor: 'text',
            '& .edit-pencil': { opacity: 1 },
          },
        }}
      >
        {value ? (
          <Typography sx={{ fontSize, fontWeight, color: color ?? 'text.primary', fontFamily, lineHeight: 1.5 }}>{value}</Typography>
        ) : (
          <Typography sx={{ fontSize: fontSize ?? '0.875rem', color: 'text.disabled', fontStyle: 'italic' }}>{emptyLabel}</Typography>
        )}
        <Box
          className="edit-pencil"
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', opacity: 0.4, transition: 'opacity 0.15s', mt: '3px', flexShrink: 0, p: 0.25 }}
        >
          <IconEdit size={16} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth, width: '100%' }}>
      <TextField
        inputRef={inputRef}
        size="small"
        fullWidth
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        maxRows={multiline ? 10 : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={saving}
      />
      <Box display="flex" gap={0.5} mt={0.5} justifyContent="flex-end">
        <Tooltip title={multiline ? t('tooltip.saveCtrlEnter') : t('tooltip.saveEnter')}>
          <span>
            <IconButton size="small" color="primary" onClick={commit} disabled={saving}>
              {saving ? <CircularProgress size={13} /> : <IconCheck size={18} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('tooltip.cancelEsc')}>
          <IconButton size="small" onClick={cancel} disabled={saving}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ─── BaseUrl panel ────────────────────────────────────────────────────────────

// ─── API Endpoints tab ────────────────────────────────────────────────────────

function ApiEndpointsTab({ tools, projectId, projectBaseUrl, anyApiKey, onToolAdded, onToolChanged, onToolDeleted }: {
  tools: GeneratedTool[]
  projectId: string
  projectBaseUrl: string
  anyApiKey?: string
  onToolAdded: (tool: GeneratedTool) => void
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}) {
  const { t } = useTranslation('serverDetail')
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editEndpoint, setEditEndpoint] = useState<GeneratedTool | null>(null)

  const apiTools = tools.filter((t): t is GeneratedTool & { endpointRef: EndpointRef } => !!t.endpointRef)
  const endpoints: Array<{ tool: GeneratedTool } & EndpointRef> = apiTools.map((t) => ({ tool: t, ...t.endpointRef }))

  const methods = [...new Set(endpoints.map((e) => e.method.toUpperCase()))].sort()

  const visible = endpoints.filter((e) => {
    const m = e.method.toUpperCase()
    if (methodFilter && m !== methodFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.path.toLowerCase().includes(q) ||
        (e.tool.description ?? '').toLowerCase().includes(q) ||
        e.tool.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  const methodCounts = Object.fromEntries(
    methods.map((m) => [m, endpoints.filter((e) => e.method.toUpperCase() === m).length])
  )

  return (
    <Box>
      {/* Stats row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard label={t('label.totalEndpoints')} value={endpoints.length} color="#5D87FF" />
        </Grid>
        {methods.map((m) => (
          <Grid item xs={6} sm={3} key={m}>
            <StatCard label={m} value={methodCounts[m]} color={METHOD_COLOR[m]} />
          </Grid>
        ))}
      </Grid>

      {/* Search + filter + add button */}
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder={t('placeholder.searchByPathNameDesc')} value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
        {methods.length > 1 && (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            <Chip label={t('label.filterAll')} size="small" clickable onClick={() => setMethodFilter(null)}
              color={methodFilter === null ? 'primary' : 'default'}
              variant={methodFilter === null ? 'filled' : 'outlined'} />
            {methods.map((m) => (
              <Chip key={m} label={m} size="small" clickable
                onClick={() => setMethodFilter(methodFilter === m ? null : m)}
                sx={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem',
                  bgcolor: methodFilter === m ? METHOD_COLOR[m] : 'transparent',
                  color: methodFilter === m ? '#fff' : METHOD_COLOR[m],
                  borderColor: METHOD_COLOR[m],
                }}
                variant="outlined" />
            ))}
          </Box>
        )}
        {(search || methodFilter) && (
          <Typography variant="body2" color="text.secondary">
            {t('label.visible', { visible: visible.length, total: endpoints.length })}
          </Typography>
        )}
        <Box flexGrow={1} />
        {can(Permission.EndpointsCreate) && (
          <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
            onClick={() => setCreateOpen(true)}>
            {t('action.addEndpoint')}
          </Button>
        )}
      </Box>

      {/* Endpoint list */}
      {endpoints.length === 0 ? (
        <Alert severity="info">{t('empty.noEndpoints')}</Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">{t('empty.noEndpointsSearch')}</Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={'6px'}>
          {visible.map((e, i) => (
            <EndpointAccordion key={i} endpoint={e} projectId={projectId} anyApiKey={anyApiKey} canTest={can(Permission.ToolsTest)}
              onEdit={can(Permission.ToolsEdit) ? () => setEditEndpoint(e.tool) : undefined}
              onToolChanged={onToolChanged} />
          ))}
        </Box>
      )}

      <ToolDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(tool) => { onToolAdded(tool); setCreateOpen(false) }}
        projectId={projectId}
        projectBaseUrl={projectBaseUrl}
        mode="endpoint"
      />

      <ToolDialog
        open={editEndpoint !== null}
        editTool={editEndpoint ?? undefined}
        onClose={() => setEditEndpoint(null)}
        onSaved={(newTool, oldName) => { onToolChanged(oldName ?? newTool.name, newTool); setEditEndpoint(null) }}
        onDeleted={(name) => { onToolDeleted(name); setEditEndpoint(null) }}
        projectId={projectId}
        projectBaseUrl={projectBaseUrl}
        mode="endpoint"
      />
    </Box>
  )
}

// ─── Tool dialog (create / edit endpoint) ────────────────────────────────────

interface ParamEntry {
  id: string
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
  type: string
  description: string
}

function emptyParam(): ParamEntry {
  return { id: Math.random().toString(36).slice(2), toolParamName: '', source: 'query', originalName: '', required: false, type: 'string', description: '' }
}

interface HeaderEntry {
  id: string
  name: string
  value: string
}

function emptyHeader(): HeaderEntry {
  return { id: Math.random().toString(36).slice(2), name: '', value: '' }
}

function toolToFormState(tool: GeneratedTool | undefined) {
  if (!tool) {
    return { name: '', description: '', method: 'GET', path: '/', contentType: 'application/json', params: [] as ParamEntry[], staticHeaders: [] as HeaderEntry[], useOutputTemplate: false, outputTemplate: '' }
  }
  const { endpointRef, inputSchema } = tool
  if (!endpointRef) {
    return { name: tool.name, description: tool.description ?? '', method: 'GET', path: '/', contentType: 'application/json', params: [] as ParamEntry[], staticHeaders: [] as HeaderEntry[], useOutputTemplate: !!tool.outputTemplate, outputTemplate: tool.outputTemplate ?? '' }
  }
  return {
    name: tool.name,
    description: tool.description ?? '',
    method: endpointRef.method,
    path: endpointRef.path,
    contentType: endpointRef.contentType ?? 'application/json',
    params: (endpointRef.parameterMap ?? []).map((pm) => ({
      id: Math.random().toString(36).slice(2),
      toolParamName: pm.toolParamName,
      source: pm.source,
      originalName: pm.originalName,
      required: pm.required,
      type: (inputSchema.properties as any)?.[pm.toolParamName]?.type ?? 'string',
      description: (inputSchema.properties as any)?.[pm.toolParamName]?.description ?? '',
    })) as ParamEntry[],
    staticHeaders: ((endpointRef as any).staticHeaders ?? []).map((h: { name: string; value: string }) => ({
      id: Math.random().toString(36).slice(2),
      name: h.name,
      value: h.value,
    })) as HeaderEntry[],
    useOutputTemplate: !!tool.outputTemplate,
    outputTemplate: tool.outputTemplate ?? '',
  }
}

interface ToolDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool, oldName?: string) => void
  onDeleted?: (toolName: string) => void
  projectId: string
  projectBaseUrl: string
  editTool?: GeneratedTool
  prefillFrom?: GeneratedTool
  mode?: 'tool' | 'endpoint'
  allTools?: GeneratedTool[]
}

// ─── Alert config panel ────────────────────────────────────────────────────────

function AlertConfigPanel({ projectId, initialConfig }: {
  projectId: string
  initialConfig?: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }
}) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [threshold, setThreshold] = useState(initialConfig?.errorThresholdPct ?? 20)
  const [email, setEmail] = useState(initialConfig?.notifyEmail ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (en: boolean, thr: number, em: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/alert-config`, { enabled: en, errorThresholdPct: thr, notifyEmail: em })
        setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000)
      } catch { setSaveStatus('error') }
    }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={enabled ? 2 : 0}>
        <IconBell size={18} />
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>Error alerts</Typography>
          <Typography variant="caption" color="text.secondary">
            Receive an email when the error rate exceeds a threshold.
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
        <FormControlLabel
          control={<Switch size="small" checked={enabled} color="warning"
            onChange={(e) => { setEnabled(e.target.checked); scheduleSave(e.target.checked, threshold, email) }} />}
          label={<Typography variant="caption">{enabled ? 'On' : 'Off'}</Typography>}
          sx={{ mr: 0 }} />
      </Box>

      {enabled && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={5}>
            <TextField size="small" fullWidth label="Alert when error rate exceeds (%)"
              type="number" inputProps={{ min: 1, max: 100 }}
              value={threshold}
              onChange={(e) => { const v = Math.max(1, Math.min(100, Number(e.target.value))); setThreshold(v); scheduleSave(enabled, v, email) }}
            />
          </Grid>
          <Grid item xs={12} sm={7}>
            <TextField size="small" fullWidth label="Send alert to (email)"
              type="email" placeholder="manager@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); scheduleSave(enabled, threshold, e.target.value) }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Checks every 15 minutes. At most one alert every 30 minutes per project.
            </Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  )
}

// ─── Tenant Config Panel ──────────────────────────────────────────────────────

type TenantParamType = 'string' | 'integer' | 'number' | 'boolean' | 'uuid' | 'hash'

interface TenantParam {
  name: string
  type: TenantParamType
  description?: string
  required?: boolean
}

const TENANT_PARAM_TYPES: { value: TenantParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number (float)' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'uuid', label: 'UUID' },
  { value: 'hash', label: 'Hash' },
]

function TenantConfigPanel({ projectId, initialConfig, toolParamSuggestions }: {
  projectId: string
  initialConfig?: { enabled: boolean; params: TenantParam[] }
  toolParamSuggestions: string[]
}) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [params, setParams] = useState<TenantParam[]>(initialConfig?.params ?? [])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (en: boolean, ps: TenantParam[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/tenant-config`, { enabled: en, params: ps })
        setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000)
      } catch { setSaveStatus('error') }
    }, 600)
  }

  const addParam = () => {
    const next = [...params, { name: '', type: 'string' as TenantParamType, description: '', required: false }]
    setParams(next)
    scheduleSave(enabled, next)
  }

  const updateParam = (idx: number, patch: Partial<TenantParam>) => {
    const next = params.map((p, i) => i === idx ? { ...p, ...patch } : p)
    setParams(next)
    scheduleSave(enabled, next)
  }

  const removeParam = (idx: number) => {
    const next = params.filter((_, i) => i !== idx)
    setParams(next)
    scheduleSave(enabled, next)
  }

  const mcpUrl = `${window.location.origin}/api/mcp/server/${projectId}`
  const previewUrl = params.filter((p) => p.name.trim()).length > 0
    ? `${mcpUrl}?${params.filter((p) => p.name.trim()).map((p) => `${p.name}={value}`).join('&')}`
    : null

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={enabled ? 2 : 0}>
        <IconDatabase size={18} />
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>Multi-tenant parameters</Typography>
          <Typography variant="caption" color="text.secondary">
            Inject query string values into tool calls that accept them.
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
        <FormControlLabel
          control={<Switch size="small" checked={enabled} color="primary"
            onChange={(e) => { setEnabled(e.target.checked); scheduleSave(e.target.checked, params) }} />}
          label={<Typography variant="caption">{enabled ? 'On' : 'Off'}</Typography>}
          sx={{ mr: 0 }} />
      </Box>

      {enabled && (
        <Box>
          {params.map((param, idx) => (
            <Box key={idx} display="flex" gap={1} alignItems="flex-start" mb={1.5}>
              <Autocomplete
                freeSolo
                size="small"
                sx={{ flex: 2 }}
                options={toolParamSuggestions}
                value={param.name}
                onInputChange={(_, val) => updateParam(idx, { name: val })}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Typography variant="body2" fontFamily="monospace">{option}</Typography>
                  </li>
                )}
                renderInput={(inputProps) => (
                  <TextField {...inputProps} label="Parameter name" placeholder="customerId" />
                )}
              />
              <FormControl size="small" sx={{ flex: 1.5 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={param.type}
                  onChange={(e) => updateParam(idx, { type: e.target.value as TenantParamType })}
                >
                  {TENANT_PARAM_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label="Description (optional)" placeholder="e.g. Customer ID"
                value={param.description ?? ''}
                onChange={(e) => updateParam(idx, { description: e.target.value })}
                sx={{ flex: 3 }}
              />
              <Tooltip title={param.required ? 'Required — rejects calls missing this param' : 'Optional — ignored if not provided'}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={param.required ?? false}
                      onChange={(e) => updateParam(idx, { required: e.target.checked })}
                      color="error"
                    />
                  }
                  label={<Typography variant="caption" color={param.required ? 'error' : 'text.secondary'}>
                    {param.required ? 'Required' : 'Optional'}
                  </Typography>}
                  sx={{ mr: 0, flexShrink: 0 }}
                />
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton size="small" color="error" onClick={() => removeParam(idx)} sx={{ mt: 0.5 }}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={addParam} sx={{ mb: 2 }}>
            Add parameter
          </Button>

          {previewUrl && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.25} fontWeight={600}>
                Example tenant URL
              </Typography>
              <Typography variant="caption" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {previewUrl}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Only tools that declare these parameters in their spec will receive the values. Others are unaffected.
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ─── Tool output template section ────────────────────────────────────────────

function ToolOutputTemplateSection({
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
      setTestError(err?.response?.data?.message ?? 'Request failed')
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
      srcDoc={livePreview ?? form.outputTemplate ?? '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet — write HTML in the Code tab.</p>'}
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
          <Typography variant="subtitle2" fontWeight={700} display="inline">HTML output template</Typography>
          <Typography variant="caption" color="text.secondary" ml={1}>
            Transform the API response into HTML using Handlebars.js
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch size="small" checked={form.useOutputTemplate}
              onChange={(e) => setForm((prev) => ({ ...prev, useOutputTemplate: e.target.checked }))} />
          }
          label={<Typography variant="body2">{form.useOutputTemplate ? 'On' : 'Off'}</Typography>}
          sx={{ m: 0 }}
        />
      </Box>

      {form.useOutputTemplate && (
        <Box display="flex" flexDirection="column" gap={2.5}>

          {/* Test & schema */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Test & map response</Typography>
            {form.params.length > 0 && (
              <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Test parameter values</Typography>
                {form.params.map((p) => (
                  <TextField key={p.toolParamName} size="small" fullWidth
                    label={p.toolParamName}
                    helperText={`source: ${p.source}${p.required ? ' · required' : ''}`}
                    value={testArgs[p.toolParamName] ?? ''}
                    onChange={(e) => setTestArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                ))}
              </Box>
            )}

            <Box display="flex" gap={1} mb={1.5}>
              <Button size="small" variant="outlined"
                startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                onClick={handleTest} disabled={testing || !form.path.trim()}>
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
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>Scalar variables</Typography>
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
                                <Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main">{`{{${s.path}}}`}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace"
                                  sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
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

                {arrays.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                      Array variables — use <code style={{ fontFamily: 'monospace' }}>{'{{#each}}'}</code> to iterate
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
                                  <Chip label={`${a.length} item${a.length !== 1 ? 's' : ''}`} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                </Box>
                                <Box component="pre" sx={{ m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 0.75, fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto', lineHeight: 1.5 }}>
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

          {/* HTML template editor */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>HTML template</Typography>
              <Tooltip title="Open Handlebars.js documentation — template syntax reference (expressions, #each, helpers)">
                <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html"
                  target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                  <IconExternalLink size={13} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Write HTML using <strong>Handlebars.js</strong> syntax, use <code>{'{{variable}}'}</code> to insert data fields and <code>{'{{#each items}}'}</code> to iterate over arrays.
            </Typography>

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
          <Typography variant="h6" fontWeight={700}>HTML template</Typography>
          <Tooltip title="Handlebars.js template syntax documentation">
            <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html"
              target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
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
        {templateTab === 0 ? monacoEditor(true) : previewFrame('Template preview expanded')}
      </Box>
    </Drawer>
    </>
  )
}

function ToolDialog({ open, onClose, onSaved, onDeleted, projectId, projectBaseUrl, editTool, prefillFrom, mode = 'tool', allTools }: ToolDialogProps) {
  const isEdit = !!editTool
  const isEndpoint = mode === 'endpoint'
  const entityLabel = isEndpoint ? 'endpoint' : 'tool'
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
  const [errorMessage, setErrorMessage] = useState('Error calling tool: {{error}}')
  const [templateTab, setTemplateTab] = useState(0)
  const [templateExpanded, setTemplateExpanded] = useState(false)

  const { can } = useAuth()

  useEffect(() => {
    if (open) {
      setForm(editTool ? toolToFormState(editTool) : prefillFrom ? { ...toolToFormState(prefillFrom), name: '', description: '' } : toolToFormState(undefined))
      setError(''); setDeleting(false)
      setCapturedSchema(null); setSavingSchema(false)
      setErrorMessage(editTool?.errorConfig?.message ?? 'Error calling tool: {{error}}')
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
      setTestError(err?.response?.data?.message ?? 'Request failed')
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
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.path.trim()) { setError('Path is required.'); return }
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
      setError(err?.response?.data?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const paramBuilder = (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} display="inline">Parameters</Typography>
          {form.params.length > 0 && (
            <Typography variant="caption" color="text.disabled" ml={1}>{form.params.length} defined</Typography>
          )}
        </Box>
        <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addParam}
          sx={{ fontSize: '0.75rem', py: 0.4, px: 1.25, minWidth: 0 }}>
          Add
        </Button>
      </Box>
      {form.params.length === 0 ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2.5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.disabled">No parameters — click <strong>Add</strong> to define one</Typography>
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
                <Tooltip title="Remove parameter">
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
                  <InputLabel>Type</InputLabel>
                  <Select value={p.type} label="Type" onChange={(e) => setParam(p.id, 'type', e.target.value)}>
                    {PARAM_TYPES.map((t) => (
                      <MenuItem key={t} value={t}><Typography fontFamily="monospace" fontSize="0.82rem">{t}</Typography></MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch size="small" checked={p.required} onChange={(e) => setParam(p.id, 'required', e.target.checked)} />}
                  label={<Typography variant="caption" color={p.required ? 'error.main' : 'text.disabled'} fontWeight={p.required ? 700 : 400}>required</Typography>}
                  sx={{ m: 0, flexShrink: 0 }} />
              </Box>
              <Box sx={{ px: 1.5, pb: 1.25, pl: '44px', borderTop: '1px solid', borderColor: 'action.hover' }}>
                <TextField size="small" fullWidth multiline minRows={4} maxRows={10} label="Description"
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
          {isEdit ? `Edit ${entityLabel} — ${editTool?.name}` : `New ${entityLabel}`}
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
              <TextField size="small" fullWidth required label="Name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth required>
                <InputLabel>HTTP Method</InputLabel>
                <Select value={form.method} label="HTTP Method" onChange={(e) => setField('method', e.target.value)}>
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
              <TextField size="small" fullWidth multiline minRows={4} maxRows={10} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth required label="Path" value={form.path} onChange={(e) => setField('path', e.target.value)} placeholder="/users/{id}" helperText={`Combined with server Base URL: ${projectBaseUrl}`} InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Content-Type" value={form.contentType} onChange={(e) => setField('contentType', e.target.value)} placeholder="application/json" />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} display="inline">Request headers</Typography>
                  {form.staticHeaders.length > 0 && <Typography variant="caption" color="text.disabled" ml={1}>{form.staticHeaders.length} defined</Typography>}
                </Box>
                <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addHeader} sx={{ fontSize: '0.75rem', py: 0.4, px: 1.25, minWidth: 0 }}>Add</Button>
              </Box>
              {form.staticHeaders.length === 0 ? (
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">No fixed headers — click <strong>Add</strong> to set one</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={0.75}>
                  {form.staticHeaders.map((h) => (
                    <Box key={h.id} display="flex" alignItems="center" gap={1}>
                      <TextField size="small" placeholder="Header-Name" value={h.name} onChange={(e) => setHeader(h.id, 'name', e.target.value)} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} sx={{ width: 180, flexShrink: 0 }} />
                      <TextField size="small" fullWidth placeholder="value" value={h.value} onChange={(e) => setHeader(h.id, 'value', e.target.value)} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} />
                      <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeHeader(h.id)}><IconTrash size={15} /></IconButton></Tooltip>
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
                <Typography variant="subtitle2" fontWeight={700}>Test & output schema</Typography>
                {(editTool?.outputSchema || capturedSchema) && (
                  <Chip size="small" label="schema configured" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />
                )}
              </Box>
              {form.params.length > 0 && (
                <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                  {form.params.map((p) => (
                    <TextField key={p.toolParamName} size="small" fullWidth label={p.toolParamName}
                      helperText={`source: ${p.source}${p.required ? ' · required' : ''}`}
                      value={testArgs[p.toolParamName] ?? ''}
                      onChange={(e) => setTestArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                  ))}
                </Box>
              )}
              <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
                <Button size="small" variant="outlined"
                  startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={handleTest} disabled={testing || !form.path.trim()}>
                  {testing ? 'Running…' : 'Test endpoint'}
                </Button>
                {testResult && parsedBody != null && (
                  <Button size="small" variant="outlined" color="success"
                    disabled={savingSchema}
                    startIcon={savingSchema ? <CircularProgress size={14} color="inherit" /> : undefined}
                    onClick={() => handleUseSchema()}>
                    {savingSchema ? 'Saving…' : schemaApplied ? 'Refresh schema' : 'Use response schema'}
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
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>Output schema variables</Typography>
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
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>1. Endpoint</Typography>
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
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>2. Test & map response</Typography>
              {form.params.length > 0 && (
                <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
                  {form.params.map((p) => (
                    <TextField key={p.toolParamName} size="small" fullWidth
                      label={p.toolParamName}
                      helperText={`source: ${p.source}${p.required ? ' · required' : ''}`}
                      value={testArgs[p.toolParamName] ?? ''}
                      onChange={(e) => setTestArgs((a) => ({ ...a, [p.toolParamName]: e.target.value }))} />
                  ))}
                </Box>
              )}
              <Box display="flex" gap={1} mb={1.5}>
                <Button size="small" variant="outlined"
                  startIcon={testing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={handleTest} disabled={testing || !form.path.trim()}>
                  {testing ? 'Running…' : 'Test endpoint'}
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
                  <Typography variant="subtitle2" fontWeight={700}>3. HTML template</Typography>
                  <Tooltip title="Open Handlebars.js documentation — template syntax reference (expressions, #each, helpers)">
                    <IconButton size="small" component="a" href="https://handlebarsjs.com/guide/expressions.html" target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
                      <IconExternalLink size={13} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <FormControlLabel
                  control={<Switch size="small" checked={form.useOutputTemplate} onChange={(e) => setForm((prev) => ({ ...prev, useOutputTemplate: e.target.checked }))} />}
                  label={<Typography variant="body2">{form.useOutputTemplate ? 'On' : 'Off'}</Typography>}
                  sx={{ m: 0 }}
                />
              </Box>
              {form.useOutputTemplate ? (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" mb={endpointOutputSchema ? 0.75 : 1}>
                    Write HTML using <strong>Handlebars.js</strong> syntax, use <code>{'{{variable}}'}</code> to insert data fields and <code>{'{{#each items}}'}</code> to iterate over arrays.
                  </Typography>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', mb: 0 }}>
                    <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }} TabIndicatorProps={{ sx: { height: 2 } }}>
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
                      <MonacoEditor height="100%" language="html" value={form.outputTemplate}
                        theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
                        onChange={(v) => setForm((prev) => ({ ...prev, outputTemplate: v ?? '' }))}
                        options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true, padding: { top: 8 } }} />
                    ) : (
                      <iframe
                        srcDoc={livePreview ?? form.outputTemplate ?? '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet — write HTML in the Code tab.</p>'}
                        sandbox="allow-same-origin"
                        style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                        title="Template preview" />
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Enable the toggle to transform the API JSON response into an HTML page using Handlebars.js.
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Section 4 — Metadata & error */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>4. Metadata & error</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField size="small" fullWidth required label="Name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
                <TextField size="small" fullWidth multiline minRows={4} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
                <TextField size="small" fullWidth label="Error message" value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  helperText='Shown to the MCP client if the API call fails. Use {{error}} to include the original error.' />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        {isEdit && can(Permission.ToolsDelete) && (
          <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}
            startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
            {`Delete ${entityLabel}`}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving || deleting}>Cancel</Button>
        {(isEdit ? can(Permission.ToolsEdit) : (isEndpoint ? can(Permission.EndpointsCreate) : can(Permission.ToolsCreate))) && (
          <Button variant="contained" onClick={handleSave} disabled={saving || deleting}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : `Create ${entityLabel}`}
          </Button>
        )}
      </Box>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete ${entityLabel}?`}
        message={`"${editTool?.name}" will be permanently removed from this server.`}
        confirmLabel="Delete" confirmColor="error" loading={deleting}
        onConfirm={handleDeleteConfirm} onClose={() => setDeleteConfirmOpen(false)}
      />
    </Drawer>

    {/* Expanded Monaco — left drawer (tool mode) */}
    {!isEndpoint && (
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
          <Tabs value={templateTab} onChange={(_, v) => setTemplateTab(v)} sx={{ minHeight: 36 }} TabIndicatorProps={{ sx: { height: 2 } }}>
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
            <MonacoEditor height="100%" language="html" value={form.outputTemplate}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(v) => setForm((prev) => ({ ...prev, outputTemplate: v ?? '' }))}
              options={{ minimap: { enabled: true }, fontSize: 14, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true, padding: { top: 16 } }} />
          ) : (
            <iframe
              srcDoc={livePreview ?? form.outputTemplate ?? '<p style="color:#888;font-family:sans-serif;padding:24px">No content yet.</p>'}
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

// ─── Tool accordion ───────────────────────────────────────────────────────────

function ToolAccordion({ tool: initialTool, projectId, anyApiKey, onToolChanged, onEditEndpoint }: {
  tool: GeneratedTool
  projectId: string
  anyApiKey?: string
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onEditEndpoint: (tool: GeneratedTool) => void
}) {
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

  const method = tool.endpointRef?.method
  const path = tool.endpointRef?.path
  const parameterMap = tool.endpointRef?.parameterMap
  const properties = tool.inputSchema.properties ?? {}
  const requiredFields = tool.inputSchema.required ?? []
  const allParams = parameterMap ?? []
  const paramEntries = Object.entries(properties)
  const curl = buildCurl(tool)
  const mcpCurl = buildMcpCurl(tool, projectId, !!anyApiKey)

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

  const methodKey = method ?? ''
  const isHttpTool = !!method
  return (
    <Accordion variant="outlined" sx={{
      mb: '6px', '&:before': { display: 'none' },
      borderColor: isDisabled ? 'divider' : isHttpTool ? `${METHOD_COLOR[methodKey] ?? '#ddd'}33` : 'divider',
      '&.Mui-expanded': { borderColor: isDisabled ? '#ccc' : isHttpTool ? `${METHOD_COLOR[methodKey] ?? '#ddd'}88` : 'primary.main' },
      opacity: isDisabled ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <AccordionSummary expandIcon={<IconChevronDown />} sx={{
        bgcolor: isDisabled ? 'action.hover' : isHttpTool ? (METHOD_BG[methodKey] ?? 'background.paper') : 'background.paper',
        borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', px: 2,
        filter: isDisabled ? 'grayscale(0.5)' : 'none',
      }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
          {/* Method badge — only for HTTP tools */}
          {isHttpTool && (
            <Box sx={{
              px: 1.2, py: 0.4, borderRadius: '4px',
              bgcolor: METHOD_COLOR[methodKey] ?? '#888', color: '#fff',
              fontWeight: 700, fontSize: '0.72rem', fontFamily: 'monospace',
              minWidth: 58, textAlign: 'center', flexShrink: 0,
            }}>
              {method}
            </Box>
          )}

          {/* Tool name — editable */}
          <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
            <InlineEdit value={tool.name} onSave={(v) => saveToolMeta('name', v)}
              readOnly={!can(Permission.ToolsEdit)} placeholder="Tool name" fontSize="0.875rem" fontWeight={700} />
          </Box>

          {/* Disabled chip */}
          {isDisabled && (
            <Chip label="Disabled" size="small" color="default"
              sx={{ fontSize: '0.65rem', height: 18, flexShrink: 0 }} />
          )}

          {/* HTML template chip */}
          {tool.outputTemplate && !isDisabled && (
            <Chip label="HTML" size="small"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'warning.main', color: '#fff', flexShrink: 0 }} />
          )}

          {/* Path — read only */}
          <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap flexGrow={1}>{path}</Typography>

          {/* Toggle enable/disable */}
          {can(Permission.ToolsEdit) && (
            <Tooltip title={isDisabled ? 'Enable — make this tool available to the AI' : 'Disable — hide this tool from the AI'}>
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
            <Tooltip title="Edit endpoint">
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
            readOnly={!can(Permission.ToolsEdit)} multiline placeholder="Describe what this tool does…"
            emptyLabel="Add description…" fontSize="0.875rem" color="text.secondary" />
        </Box>

        {/* Parameters table */}
        {allParams.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Parameters</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2 }}>
              <Table size="small" sx={{ minWidth: 480, '& td': { fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>In</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Description</TableCell>
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
                            ? <Typography color="error.main" fontSize="0.72rem" fontWeight={700}>yes</Typography>
                            : <Typography color="text.disabled" fontSize="0.72rem">no</Typography>}
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
          <Typography variant="subtitle2" fontWeight={700}>Try</Typography>
          {can(Permission.ToolsTest) && (
            <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
              onClick={() => { setTryMode((v) => !v); setResponse(null) }}
              sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
              {tryMode ? 'Cancel' : 'Try'}
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
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>No parameters.</Typography>}

            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={18} />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? 'Executing…' : 'Execute'}
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
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Direct API curl</Typography>
              <Box component="pre" sx={{
                bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={curlCopied ? 'Copied!' : 'Copy'}>
                  <IconButton size="small"
                    onClick={() => { navigator.clipboard.writeText(curl); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000) }}
                    sx={{ position: 'absolute', top: 8, right: 8, color: curlCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                    <IconCopy size={15} />
                  </IconButton>
                </Tooltip>
                {curl}
              </Box>
            </Box>

            {/* MCP via POST */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>MCP call (POST /mcp/server)</Typography>
              <Box component="pre" sx={{
                bgcolor: '#282c34', color: '#abb2bf', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={mcpCurlCopied ? 'Copied!' : 'Copy'}>
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

// ─── ResourcesTab ─────────────────────────────────────────────────────────────

// ─── Dynamic Resource Dialog ──────────────────────────────────────────────────

interface HbScalar { path: string; sample: string }
interface HbArray  { path: string; length: number; itemScalars: string[] }

function extractHbSchema(root: unknown, prefix = '', depth = 0): { scalars: HbScalar[]; arrays: HbArray[] } {
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

function DynamicResourceDialog({
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
                          <Chip label={t.endpointRef!.method.toUpperCase()} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                          <Typography variant="body2" fontFamily="monospace">{t.endpointRef!.path}</Typography>
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
                        bgcolor: METHOD_COLOR[selectedTool.endpointRef?.method.toUpperCase() ?? ''] ?? '#888',
                        color: '#fff',
                      }}>
                        {selectedTool.endpointRef?.method.toUpperCase()}
                      </Box>
                      <Typography fontFamily="monospace" fontSize="0.84rem" fontWeight={600} flexGrow={1} minWidth={0} noWrap>
                        {selectedTool.endpointRef?.path}
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
            {selectedTool && (selectedTool.endpointRef?.parameterMap?.length ?? 0) > 0 && (
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Fixed parameter values</Typography>
                {selectedTool.endpointRef?.parameterMap?.map((p) => (
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
              <TextField size="small" fullWidth multiline minRows={4} label="Description" value={description}
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

// ─── ResourceTestPanel ────────────────────────────────────────────────────────

function ResourceTestPanel({ resource, projectId, anyApiKey }: {
  resource: McpResource
  projectId: string
  anyApiKey?: string
}) {
  const [open, setOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleExecute = async () => {
    setExecuting(true)
    setResponse(null)
    setIsError(false)
    try {
      const res = await api.post(
        `/mcp/server/${projectId}`,
        { jsonrpc: '2.0', method: 'resources/read', id: Date.now(), params: { uri: resource.uri } },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(anyApiKey ? { auth: anyApiKey } : {}) } },
      )
      const rpc = parseMcpResponse(res.data)
      const result = rpc?.result
      const text = result?.contents?.[0]?.text ?? JSON.stringify(result ?? rpc, null, 2)
      setResponse(text)
      setIsError(!!rpc?.error)
    } catch (err: any) {
      setResponse(err?.response?.data ? JSON.stringify(err.response.data, null, 2) : String(err))
      setIsError(true)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700} fontSize="0.8rem">Test</Typography>
        <Button
          size="small"
          variant="outlined"
          color={open ? 'error' : 'primary'}
          onClick={() => { setOpen((v) => !v); setResponse(null); setIsError(false) }}
        >
          {open ? 'Cancel' : 'Try'}
        </Button>
      </Box>
      {open && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            No inputs required — the URI is fixed.
          </Typography>
          <Box>
            <Button
              variant="contained"
              size="small"
              disabled={executing}
              startIcon={executing ? <CircularProgress size={12} color="inherit" /> : <IconPlayerPlay size={14} />}
              onClick={handleExecute}
              sx={{ mt: 1, fontWeight: 600 }}
            >
              {executing ? 'Executing…' : 'Execute'}
            </Button>
          </Box>
          {response !== null && (
            <Box component="pre" sx={{
              bgcolor: isError ? 'error.light' : '#1e1e1e',
              color: isError ? 'error.dark' : '#d4d4d4',
              p: 2, borderRadius: 1, fontSize: '0.75rem',
              overflowX: 'auto', maxHeight: 300,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              m: 0, mt: 1.5,
            }}>
              {response}
            </Box>
          )}
        </Box>
      )}
    </>
  )
}

// ─── Resources tab ─────────────────────────────────────────────────────────────

function ResourcesTab({ projectId, initialResources, tools, onChange, anyApiKey }: {
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
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField size="small" fullWidth multiline minRows={4} maxRows={10} label="Description" value={form.description}
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

// ─── PromptsTab ───────────────────────────────────────────────────────────────

// ─── ChainsTab ────────────────────────────────────────────────────────────────

function newStepId() { return `step_${Math.random().toString(36).slice(2, 10)}` }

function StepBuilder({
  step,
  index,
  total,
  tools,
  previousSteps,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ChainStep
  index: number
  total: number
  tools: GeneratedTool[]
  previousSteps: ChainStep[]
  onChange: (s: ChainStep) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const tool = tools.find((t) => t.name === step.toolName)
  const params = Object.keys(tool?.inputSchema?.properties ?? {})

  const updateMapping = (paramName: string, input: ChainInputSource) => {
    const existing = step.inputMapping.filter((m) => m.paramName !== paramName)
    onChange({ ...step, inputMapping: [...existing, { paramName, input }] })
  }

  const getMapping = (paramName: string): ChainInputSource =>
    step.inputMapping.find((m) => m.paramName === paramName)?.input ?? { source: 'literal', value: '' }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Chip label={`Step ${index + 1}`} size="small" color="primary" sx={{ fontSize: '0.72rem', height: 20 }} />
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Tool</InputLabel>
          <Select
            value={step.toolName}
            label="Tool"
            onChange={(e) => {
              const newTool = tools.find((t) => t.name === e.target.value)
              const newParams = Object.keys(newTool?.inputSchema?.properties ?? {})
              onChange({
                ...step,
                toolName: e.target.value,
                inputMapping: newParams.map((p) => ({
                  paramName: p,
                  input: { source: 'literal' as const, value: '' },
                })),
              })
            }}
          >
            {tools.map((t) => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Move up"><span>
          <IconButton size="small" onClick={onMoveUp} disabled={index === 0}><IconChevronUp size={15} /></IconButton>
        </span></Tooltip>
        <Tooltip title="Move down"><span>
          <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1}><IconChevronDown size={15} /></IconButton>
        </span></Tooltip>
        <Tooltip title="Remove step">
          <IconButton size="small" color="error" onClick={onRemove}><IconX size={15} /></IconButton>
        </Tooltip>
      </Box>

      {params.length > 0 && tool && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem', width: '25%' }}>Param</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem', width: '22%' }}>Source</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem' }}>Value / Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {params.map((param) => {
              const mapping = getMapping(param)
              return (
                <TableRow key={param} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography fontFamily="monospace" fontSize="0.78rem" fontWeight={600}>{param}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Select
                      size="small" fullWidth value={mapping.source}
                      onChange={(e) => {
                        const src = e.target.value as ChainInputSource['source']
                        if (src === 'literal') updateMapping(param, { source: 'literal', value: '' })
                        else if (src === 'chain_input') updateMapping(param, { source: 'chain_input', paramName: '' })
                        else updateMapping(param, { source: 'step_output', stepId: previousSteps[0]?.id ?? '', jsonPath: '' })
                      }}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      <MenuItem value="literal" sx={{ fontSize: '0.78rem' }}>Literal</MenuItem>
                      <MenuItem value="chain_input" sx={{ fontSize: '0.78rem' }}>Chain input</MenuItem>
                      <MenuItem value="step_output" disabled={previousSteps.length === 0} sx={{ fontSize: '0.78rem' }}>Step output</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    {mapping.source === 'literal' && (
                      <TextField size="small" fullWidth placeholder="value…"
                        value={mapping.value}
                        onChange={(e) => updateMapping(param, { source: 'literal', value: e.target.value })}
                        InputProps={{ sx: { fontSize: '0.78rem' } }}
                      />
                    )}
                    {mapping.source === 'chain_input' && (
                      <TextField size="small" fullWidth placeholder="chain param name…"
                        value={mapping.paramName}
                        onChange={(e) => updateMapping(param, { source: 'chain_input', paramName: e.target.value })}
                        InputProps={{ sx: { fontSize: '0.78rem' } }}
                        helperText="Creates an input param on this chain"
                      />
                    )}
                    {mapping.source === 'step_output' && (
                      <Box display="flex" gap={0.5}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={mapping.stepId}
                            onChange={(e) => updateMapping(param, { ...mapping, source: 'step_output', stepId: e.target.value })}
                            sx={{ fontSize: '0.78rem' }}
                          >
                            {previousSteps.map((s, i) => (
                              <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.78rem' }}>Step {i + 1}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField size="small" placeholder="JSON path (e.g. data.id)"
                          value={mapping.jsonPath}
                          onChange={(e) => updateMapping(param, { ...mapping, source: 'step_output', jsonPath: e.target.value })}
                          InputProps={{ sx: { fontSize: '0.78rem' } }}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {params.length === 0 && step.toolName && (
        <Typography variant="caption" color="text.secondary">This tool has no parameters.</Typography>
      )}
      {!step.toolName && (
        <Typography variant="caption" color="text.secondary">Select a tool above to configure input mapping.</Typography>
      )}
    </Paper>
  )
}

function ChainDialog({
  open,
  editTarget,
  tools,
  onClose,
  onSaved,
}: {
  open: boolean
  editTarget: ToolChain | null
  tools: GeneratedTool[]
  onClose: () => void
  onSaved: (chain: ToolChain) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [steps, setSteps] = useState<ChainStep[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editTarget?.name ?? '')
      setDescription(editTarget?.description ?? '')
      setEnabled(editTarget?.enabled !== false)
      setSteps(editTarget?.steps ?? [])
      setError('')
    }
  }, [open, editTarget])

  const chainInputParams = useMemo(() => {
    const params = new Set<string>()
    for (const step of steps) {
      for (const m of step.inputMapping) {
        if (m.input.source === 'chain_input' && m.input.paramName.trim()) {
          params.add(m.input.paramName.trim())
        }
      }
    }
    return [...params]
  }, [steps])

  const inputSchema: JsonSchema = useMemo(() => ({
    type: 'object',
    properties: Object.fromEntries(chainInputParams.map((p) => [p, { type: 'string', description: `Chain input: ${p}` }])),
    required: chainInputParams,
  }), [chainInputParams])

  const addStep = () => {
    setSteps((prev) => [...prev, { id: newStepId(), toolName: tools[0]?.name ?? '', inputMapping: [] }])
  }

  const updateStep = (i: number, s: ChainStep) => setSteps((prev) => prev.map((x, idx) => idx === i ? s : x))
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i))
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const arr = [...prev]
      const j = i + dir
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 600 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{editTarget ? `Edit chain — ${editTarget.name}` : 'New chain'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              size="small" label="Name" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. search_and_book"
              sx={{ flex: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
              label="Enabled"
              sx={{ mt: 0.25, flexShrink: 0 }}
            />
          </Box>
          <TextField
            size="small" fullWidth multiline minRows={4} label="Description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this chain does…"
          />

          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>Steps</Typography>
              <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addStep}
                disabled={tools.length === 0}>
                Add step
              </Button>
            </Box>

            {steps.length === 0 ? (
              <Alert severity="info">
                Click <strong>Add step</strong> to start building the chain.
                Each step calls a tool and passes its output to the next step.
              </Alert>
            ) : (
              steps.map((step, i) => (
                <StepBuilder
                  key={step.id}
                  step={step}
                  index={i}
                  total={steps.length}
                  tools={tools}
                  previousSteps={steps.slice(0, i)}
                  onChange={(s) => updateStep(i, s)}
                  onRemove={() => removeStep(i)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                />
              ))
            )}
          </Box>

          {chainInputParams.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Auto-derived chain inputs (exposed to the MCP client)
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {chainInputParams.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined" color="primary"
                    sx={{ fontSize: '0.72rem', fontFamily: 'monospace', height: 20 }} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={async () => {
            if (!name.trim()) { setError('Name is required.'); return }
            if (steps.length === 0) { setError('Add at least one step.'); return }
            setSaving(true); setError('')
            onSaved({ id: editTarget?.id ?? '', name: name.trim(), description: description.trim() || undefined, inputSchema, steps, enabled })
          }}
        >
          {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create chain'}
        </Button>
      </Box>
    </Drawer>
  )
}

function ChainsTab({ projectId, initialChains, tools, onChange }: {
  projectId: string
  initialChains: ToolChain[]
  tools: GeneratedTool[]
  onChange: (chains: ToolChain[]) => void
}) {
  const { can } = useAuth()
  const [chains, setChains] = useState<ToolChain[]>(initialChains)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ToolChain | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ToolChain | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [chainError, setChainError] = useState<string | null>(null)

  const openCreate = () => { setEditTarget(null); setChainError(null); setDialogOpen(true) }
  const openEdit = (c: ToolChain) => { setEditTarget(c); setChainError(null); setDialogOpen(true) }

  const handleSaved = async (chain: ToolChain) => {
    try {
      if (editTarget) {
        const { data } = await api.patch<ToolChain>(`/swagger/servers/${projectId}/chains/${editTarget.id}`, chain)
        const updated = chains.map((c) => c.id === editTarget.id ? data : c)
        setChains(updated); onChange(updated)
      } else {
        const { data } = await api.post<ToolChain>(`/swagger/servers/${projectId}/chains`, chain)
        const updated = [data, ...chains]
        setChains(updated); onChange(updated)
      }
      setDialogOpen(false)
    } catch (err: any) {
      setChainError(err?.response?.data?.message ?? 'Failed to save chain.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/chains/${deleteTarget.id}`)
      const updated = chains.filter((c) => c.id !== deleteTarget.id)
      setChains(updated); onChange(updated)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.25}>Tool chains</Typography>
          <Typography variant="body2" color="text.secondary">
            Sequential tool compositions that appear as a single MCP tool.
            Each step's output is available to the next step.
          </Typography>
        </Box>
        {can(Permission.ToolsCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={openCreate}
            disabled={tools.length === 0}>
            New chain
          </Button>
        )}
      </Box>

      {tools.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No tools available. Upload a spec first to create tool chains.
        </Alert>
      )}

      {chains.length === 0 ? (
        <Alert severity="info">
          No chains yet. Click <strong>New chain</strong> to create one.
        </Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {chains.map((chain) => (
            <Paper key={chain.id} variant="outlined" sx={{
              p: 2,
              '&:hover': { borderColor: 'primary.main' },
              transition: 'border-color 0.15s',
            }}>
              <Box display="flex" alignItems="flex-start" gap={1.5}>
                <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>
                  <IconArrowsShuffle size={18} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                    <Typography fontWeight={700} noWrap>{chain.name}</Typography>
                    {chain.enabled === false && <Chip label="disabled" size="small" color="default" sx={{ fontSize: '0.68rem', height: 18 }} />}
                    <Chip label={`${chain.steps.length} step${chain.steps.length !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                  </Box>
                  {chain.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>{chain.description}</Typography>
                  )}
                  <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                    {chain.steps.map((s, i) => (
                      <Typography key={s.id} variant="caption" fontFamily="monospace" color="text.secondary">
                        {i > 0 && '→ '}{s.toolName}
                      </Typography>
                    ))}
                  </Box>
                </Box>
                <Box display="flex" gap={0.25} flexShrink={0}>
                  {can(Permission.ToolsEdit) && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(chain)}>
                        <IconEdit size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {can(Permission.ToolsDelete) && (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(chain)}>
                        <IconTrash size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {chainError && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setChainError(null)}>{chainError}</Alert>}

      <ChainDialog
        open={dialogOpen}
        editTarget={editTarget}
        tools={tools}
        onClose={() => { setDialogOpen(false); setChainError(null) }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete chain "${deleteTarget?.name}"?`}
        message="This chain will be permanently removed and will no longer appear in the MCP server."
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}

// ─── PromptTestPanel ──────────────────────────────────────────────────────────

function PromptTestPanel({ prompt, projectId, anyApiKey }: {
  prompt: GlobalPrompt
  projectId: string
  anyApiKey?: string
}) {
  const argNames = [...new Set([...prompt.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
  const [open, setOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleExecute = async () => {
    setExecuting(true)
    setResponse(null)
    setIsError(false)
    try {
      const res = await api.post(
        `/mcp/server/${projectId}`,
        { jsonrpc: '2.0', method: 'prompts/get', id: Date.now(), params: { name: prompt.name, arguments: formValues } },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(anyApiKey ? { auth: anyApiKey } : {}) } },
      )
      const rpc = parseMcpResponse(res.data)
      const result = rpc?.result
      const text = result?.messages?.[0]?.content?.text ?? JSON.stringify(result ?? rpc, null, 2)
      setResponse(text)
      setIsError(!!rpc?.error)
    } catch (err: any) {
      setResponse(err?.response?.data ? JSON.stringify(err.response.data, null, 2) : String(err))
      setIsError(true)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700} fontSize="0.8rem">Test</Typography>
        <Button
          size="small"
          variant="outlined"
          color={open ? 'error' : 'primary'}
          onClick={() => { setOpen((v) => !v); setResponse(null); setIsError(false); setFormValues({}) }}
        >
          {open ? 'Cancel' : 'Try'}
        </Button>
      </Box>
      {open && (
        <Box mt={1}>
          {argNames.length > 0 ? (
            <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
              {argNames.map((arg) => (
                <TextField
                  key={arg}
                  size="small"
                  fullWidth
                  label={arg}
                  placeholder="<string>"
                  value={formValues[arg] ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [arg]: e.target.value }))}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              This prompt has no variables.
            </Typography>
          )}
          <Button
            variant="contained"
            size="small"
            disabled={executing}
            startIcon={executing ? <CircularProgress size={12} color="inherit" /> : <IconPlayerPlay size={14} />}
            onClick={handleExecute}
            sx={{ fontWeight: 600 }}
          >
            {executing ? 'Executing…' : 'Execute'}
          </Button>
          {response !== null && (
            <Box component="pre" sx={{
              bgcolor: isError ? 'error.light' : '#1e1e1e',
              color: isError ? 'error.dark' : '#d4d4d4',
              p: 2, borderRadius: 1, fontSize: '0.75rem',
              overflowX: 'auto', maxHeight: 300,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              m: 0, mt: 1.5,
            }}>
              {response}
            </Box>
          )}
        </Box>
      )}
    </>
  )
}

function PromptsTab({ projectId, initialPrompts, onChange, anyApiKey }: {
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: color ? `${color}44` : 'divider' }}>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  )
}

// ─── Execution logs tab ───────────────────────────────────────────────────────

// ─── ConnectionTab ────────────────────────────────────────────────────────────

function maskSecret(val: string | undefined | null, visibleChars = 0): string {
  if (!val) return '—'
  if (visibleChars > 0) {
    return '••••••' + val.slice(-visibleChars)
  }
  return '••••••'
}

function ConnectionConfigDisplay({ config, sourceType }: { config: Record<string, unknown>; sourceType: SourceType }) {
  if (isSqlSource(sourceType) && sourceType !== 'mongodb' && sourceType !== 'redis') {
    const rows: Array<{ label: string; value: string; mask?: boolean }> = [
      { label: 'Host', value: String(config.host ?? '—') },
      { label: 'Port', value: String(config.port ?? '—') },
      { label: 'Database', value: String(config.database ?? '—') },
      { label: 'Username', value: String(config.username ?? '—') },
      { label: 'Password', value: String(config.password ?? ''), mask: true },
      { label: 'SSL', value: config.ssl ? 'Enabled' : 'Disabled' },
    ]
    return (
      <Table size="small">
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontFamily: r.mask ? 'monospace' : undefined, fontSize: '0.85rem' }}>
                {r.mask ? maskSecret(config.password as string) : r.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'mongodb') {
    const uri = String(config.uri ?? '—')
    const maskedUri = uri.replace(/:([^@/]+)@/, ':••••••@')
    return (
      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>URI</TableCell>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>{maskedUri}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'redis') {
    return (
      <Table size="small">
        <TableBody>
          {[
            { label: 'Host', value: String(config.host ?? '—') },
            { label: 'Port', value: String(config.port ?? '6379') },
            { label: 'Password', value: maskSecret(config.password as string) },
          ].map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontSize: '0.85rem', fontFamily: r.label === 'Password' ? 'monospace' : undefined }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'dynamodb') {
    return (
      <Table size="small">
        <TableBody>
          {[
            { label: 'Region', value: String(config.region ?? '—') },
            { label: 'Access Key', value: maskSecret(config.accessKeyId as string, 4) },
            { label: 'Secret Key', value: '••••••' },
          ].map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'elasticsearch') {
    return (
      <Table size="small">
        <TableBody>
          {[
            { label: 'URL', value: String(config.url ?? '—') },
            { label: 'Auth method', value: String(config.authMethod ?? 'none') },
          ].map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontSize: '0.85rem' }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'snowflake') {
    return (
      <Table size="small">
        <TableBody>
          {[
            { label: 'Account', value: String(config.account ?? '—') },
            { label: 'Warehouse', value: String(config.warehouse ?? '—') },
            { label: 'Database', value: String(config.database ?? '—') },
            { label: 'Schema', value: String(config.schema ?? '—') },
            { label: 'Username', value: String(config.username ?? '—') },
            { label: 'Password', value: maskSecret(config.password as string) },
          ].map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontSize: '0.85rem', fontFamily: r.label === 'Password' ? 'monospace' : undefined }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (sourceType === 'firestore') {
    const sa = config.serviceAccount as Record<string, unknown> | undefined
    return (
      <Table size="small">
        <TableBody>
          {[
            { label: 'Project ID', value: String(config.projectId ?? sa?.project_id ?? '—') },
            { label: 'Service account', value: String(sa?.client_email ?? '—') },
          ].map((r) => (
            <TableRow key={r.label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{r.label}</TableCell>
              <TableCell sx={{ fontSize: '0.85rem' }}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  // Fallback: show all keys
  return (
    <Table size="small">
      <TableBody>
        {Object.entries(config).map(([k, v]) => (
          <TableRow key={k} sx={{ '&:last-child td': { border: 0 } }}>
            <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', fontSize: '0.82rem' }}>{k}</TableCell>
            <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{String(v)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ConnectionTab({ projectId, connectionConfig, sourceType, onUpdated }: {
  projectId: string
  connectionConfig: Record<string, unknown> | undefined
  sourceType: SourceType
  onUpdated: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; error?: string } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const display = SOURCE_DISPLAY[sourceType]

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<{ ok: boolean; latencyMs?: number; error?: string }>(
        `/swagger/servers/${projectId}/test-db-connection`
      )
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.response?.data?.message ?? 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await api.patch(`/swagger/servers/${projectId}/connection`, formData)
      setSaveSuccess(true)
      setDrawerOpen(false)
      onUpdated()
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Failed to save connection')
    } finally {
      setSaving(false)
    }
  }

  const openDrawer = () => {
    // Pre-fill form with existing non-sensitive values
    const prefill: Record<string, string> = {}
    if (connectionConfig) {
      for (const [k, v] of Object.entries(connectionConfig)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          prefill[k] = String(v)
        }
      }
    }
    setFormData(prefill)
    setSaveError('')
    setSaveSuccess(false)
    setDrawerOpen(true)
  }

  const setField = (key: string, val: string) => setFormData((prev) => ({ ...prev, [key]: val }))

  const renderConnectionForm = () => {
    if (isSqlSource(sourceType) && sourceType !== 'mongodb') {
      const fields = [
        { key: 'host', label: 'Host', required: true },
        { key: 'port', label: 'Port', required: false },
        { key: 'database', label: 'Database', required: true },
        { key: 'username', label: 'Username', required: true },
        { key: 'password', label: 'Password', required: false, password: true },
      ]
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          {fields.map((f) => (
            <TextField
              key={f.key} label={f.label} value={formData[f.key] ?? ''} size="small" fullWidth required={f.required}
              type={f.password ? 'password' : 'text'} onChange={(e) => setField(f.key, e.target.value)}
            />
          ))}
          <FormControlLabel
            control={<Switch checked={formData.ssl === 'true'} onChange={(e) => setField('ssl', e.target.checked ? 'true' : 'false')} />}
            label="SSL"
          />
        </Box>
      )
    }
    if (sourceType === 'mongodb') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="MongoDB URI" value={formData.uri ?? ''} size="small" fullWidth required
            placeholder="mongodb+srv://user:password@cluster.mongodb.net/dbname"
            onChange={(e) => setField('uri', e.target.value)}
          />
        </Box>
      )
    }
    if (sourceType === 'redis') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Host" value={formData.host ?? ''} size="small" fullWidth required onChange={(e) => setField('host', e.target.value)} />
          <TextField label="Port" value={formData.port ?? '6379'} size="small" fullWidth onChange={(e) => setField('port', e.target.value)} />
          <TextField label="Password" value={formData.password ?? ''} size="small" fullWidth type="password" onChange={(e) => setField('password', e.target.value)} />
        </Box>
      )
    }
    if (sourceType === 'dynamodb') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Region" value={formData.region ?? ''} size="small" fullWidth required onChange={(e) => setField('region', e.target.value)} />
          <TextField label="Access Key ID" value={formData.accessKeyId ?? ''} size="small" fullWidth required onChange={(e) => setField('accessKeyId', e.target.value)} />
          <TextField label="Secret Access Key" value={formData.secretAccessKey ?? ''} size="small" fullWidth required type="password" onChange={(e) => setField('secretAccessKey', e.target.value)} />
        </Box>
      )
    }
    if (sourceType === 'elasticsearch') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="URL" value={formData.url ?? ''} size="small" fullWidth required placeholder="https://localhost:9200" onChange={(e) => setField('url', e.target.value)} />
          <FormControl size="small" fullWidth>
            <InputLabel>Auth method</InputLabel>
            <Select value={formData.authMethod ?? 'none'} label="Auth method" onChange={(e) => setField('authMethod', e.target.value as string)}>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="basic">Basic (user/password)</MenuItem>
              <MenuItem value="apiKey">API Key</MenuItem>
            </Select>
          </FormControl>
          {formData.authMethod === 'basic' && (
            <>
              <TextField label="Username" value={formData.username ?? ''} size="small" fullWidth onChange={(e) => setField('username', e.target.value)} />
              <TextField label="Password" value={formData.password ?? ''} size="small" fullWidth type="password" onChange={(e) => setField('password', e.target.value)} />
            </>
          )}
          {formData.authMethod === 'apiKey' && (
            <TextField label="API Key" value={formData.apiKey ?? ''} size="small" fullWidth type="password" onChange={(e) => setField('apiKey', e.target.value)} />
          )}
        </Box>
      )
    }
    if (sourceType === 'snowflake') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          {[
            { key: 'account', label: 'Account', required: true },
            { key: 'warehouse', label: 'Warehouse', required: true },
            { key: 'database', label: 'Database', required: true },
            { key: 'schema', label: 'Schema', required: false },
            { key: 'username', label: 'Username', required: true },
            { key: 'password', label: 'Password', required: false, password: true },
          ].map((f) => (
            <TextField key={f.key} label={f.label} value={formData[f.key] ?? ''} size="small" fullWidth
              required={f.required} type={(f as any).password ? 'password' : 'text'}
              onChange={(e) => setField(f.key, e.target.value)} />
          ))}
        </Box>
      )
    }
    if (sourceType === 'firestore') {
      return (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Project ID" value={formData.projectId ?? ''} size="small" fullWidth required onChange={(e) => setField('projectId', e.target.value)} />
          <TextField label="Service Account JSON" value={formData.serviceAccountJson ?? ''} size="small" fullWidth multiline minRows={4}
            placeholder='{"type":"service_account","project_id":"...","client_email":"...",...}'
            onChange={(e) => setField('serviceAccountJson', e.target.value)} />
        </Box>
      )
    }
    // Generic fallback
    return (
      <Alert severity="info">Connection editor for {display.label} is not yet available. Use the API directly.</Alert>
    )
  }

  return (
    <Box>
      {/* Connection status */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '10px' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Connection status</Typography>
          <Button variant="outlined" size="small" startIcon={<IconDatabase size={16} />}
            onClick={handleTest} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
        </Box>
        {testing && <Box display="flex" alignItems="center" gap={1}><CircularProgress size={16} /><Typography variant="body2" color="text.secondary">Connecting…</Typography></Box>}
        {testResult && !testing && (
          testResult.ok
            ? <Chip label={`Connected · ${testResult.latencyMs ?? 0}ms`} color="success" size="small" icon={<IconCheck size={14} />} />
            : <Chip label={`Failed: ${testResult.error ?? 'Unknown error'}`} color="error" size="small" icon={<IconX size={14} />} sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }} />
        )}
        {!testResult && !testing && (
          <Typography variant="body2" color="text.secondary">Click "Test connection" to verify connectivity.</Typography>
        )}
      </Paper>

      {/* Connection details */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Connection details</Typography>
          <Button variant="outlined" size="small" startIcon={<IconEdit size={16} />} onClick={openDrawer}>
            Edit connection
          </Button>
        </Box>
        {connectionConfig
          ? <ConnectionConfigDisplay config={connectionConfig} sourceType={sourceType} />
          : (
            <Box textAlign="center" py={3}>
              <Typography color="text.secondary" variant="body2" mb={1}>No connection configured yet.</Typography>
              <Button variant="contained" size="small" startIcon={<IconPlus size={16} />} onClick={openDrawer}>
                Add connection
              </Button>
            </Box>
          )
        }
      </Paper>

      {/* Edit connection drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 480, p: 3 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h6" fontWeight={700}>Edit connection — {display.label}</Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        {renderConnectionForm()}
        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>Connection saved.</Alert>}
        <Box display="flex" gap={1} mt={3} justifyContent="flex-end">
          <Button variant="outlined" size="small" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  )
}

// ─── OperationsTab + OperationDialog (legacy DbQuery storage) ─────────────────

function detectSqlParamsFromQuery(query: string): string[] {
  const matches = query.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

function detectTemplateParams(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g) ?? []
  return [...new Set(matches.map((m) => m.slice(2, -2)))]
}

function detectGqlParams(doc: string): string[] {
  const matches = doc.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

const NOSQL_SOURCES_SET = new Set<string>(['mongodb', 'redis', 'dynamodb', 'elasticsearch', 'firestore'])
const SQL_SOURCES_SET = new Set<string>(['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'cockroachdb', 'clickhouse', 'cassandra', 'snowflake'])

function emptyDbQuery(sourceType: string): Partial<DbQuery> {
  if (SQL_SOURCES_SET.has(sourceType)) return { name: '', description: '', query: '', resultMode: 'rows', parameters: [] }
  if (sourceType === 'mongodb' || sourceType === 'firestore') return { name: '', description: '', collection: '', operationType: 'find', filterTemplate: '{}', parameters: [] }
  if (sourceType === 'redis') return { name: '', description: '', redisTemplate: 'exact_key' as const, keyPattern: '', parameters: [] }
  if (sourceType === 'dynamodb') return { name: '', description: '', tableName: '', dynamoOperation: 'getItem', parameters: [] }
  if (sourceType === 'elasticsearch') return { name: '', description: '', esIndex: '', esOperation: 'search', esBodyTemplate: '{}', parameters: [] }
  if (sourceType === 'graphql') return { name: '', description: '', gqlOperationType: 'query', gqlDocument: '', parameters: [] }
  if (sourceType === 'grpc') return { name: '', description: '', grpcService: '', grpcMethod: '', grpcRequestTemplate: '{}', parameters: [] }
  return { name: '', description: '', parameters: [] }
}

function ParamTable({ params, onParamChange }: {
  params: DbQueryParameter[]
  onParamChange: (params: DbQueryParameter[]) => void
}) {
  const addParam = () => {
    let index = params.length + 1
    let name = `param${index}`
    while (params.some((p) => p.name === name)) {
      index++
      name = `param${index}`
    }
    onParamChange([...params, { name, type: 'string', required: false, description: '' }])
  }

  const updateParam = (index: number, patch: Partial<DbQueryParameter>) => {
    const updated = [...params]
    updated[index] = { ...updated[index], ...patch }
    onParamChange(updated)
  }

  const removeParam = (index: number) => {
    onParamChange(params.filter((_, i) => i !== index))
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5} mb={1.5}>
        <Box minWidth={0}>
          <Typography variant="subtitle2">Input parameters</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            Define GET-like inputs for this operation. Use them as variables in SQL, JSON templates, Redis keys, GraphQL variables, or request templates.
          </Typography>
          <Box display="flex" gap={0.75} flexWrap="wrap" mt={1}>
            {[':productId', '{{email}}', '$userId'].map((example) => (
              <Chip
                key={example}
                size="small"
                variant="outlined"
                label={example}
                sx={{ height: 22, fontFamily: 'monospace', fontSize: '0.72rem' }}
              />
            ))}
          </Box>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<IconPlus size={14} />}
          onClick={addParam}
          sx={{ flexShrink: 0 }}
        >
          Add parameter
        </Button>
      </Box>
      {params.length === 0 ? (
        <Box
          px={1.5}
          py={1.25}
          border="1px dashed"
          borderColor="divider"
          borderRadius={1}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
        >
          <Typography variant="body2" color="text.secondary">
            No input parameters yet. Add one to expose it in the operation input schema.
          </Typography>
          <Button size="small" startIcon={<IconPlus size={14} />} onClick={addParam}>
            Add
          </Button>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {params.map((p, i) => (
            <Paper
              key={`${p.name}-${i}`}
              variant="outlined"
              sx={{ p: 1, borderColor: 'divider', bgcolor: 'background.default' }}
            >
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <TextField
                  size="small"
                  label="Name"
                  value={p.name}
                  placeholder="productId"
                  sx={{ flex: '1 1 150px', minWidth: 140 }}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                  onChange={(e) => {
                    const nextName = e.target.value.trim().replace(/\s+/g, '_')
                    updateParam(i, { name: nextName })
                  }}
                />
                <FormControl size="small" sx={{ width: 132 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={p.type}
                    label="Type"
                    sx={{ fontSize: '0.82rem' }}
                    onChange={(e) => updateParam(i, { type: e.target.value as DbQueryParameter['type'] })}
                  >
                    {['string', 'number', 'boolean', 'array', 'object'].map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  sx={{ mx: 0, minWidth: 96 }}
                  control={(
                    <Switch
                      size="small"
                      checked={p.required ?? false}
                      onChange={(e) => updateParam(i, { required: e.target.checked })}
                    />
                  )}
                  label={<Typography variant="caption">Required</Typography>}
                />
                <TextField
                  size="small"
                  label="Default"
                  value={String(p.default ?? '')}
                  placeholder="Optional"
                  sx={{ flex: '0 1 130px', minWidth: 120 }}
                  onChange={(e) => updateParam(i, { default: e.target.value || undefined })}
                />
                <Tooltip title="Remove parameter">
                  <IconButton size="small" color="error" onClick={() => removeParam(i)} sx={{ ml: 'auto' }}>
                    <IconTrash size={15} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                size="small"
                label="Description"
                value={p.description ?? ''}
                placeholder="Describe how this input is used"
                fullWidth
                sx={{ mt: 1 }}
                onChange={(e) => updateParam(i, { description: e.target.value })}
              />
            </Paper>
          ))}
        </Box>
      )}

      {params.length > 0 && (
        <Box sx={{ mt: 1.5, px: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Each parameter becomes a variable you can inject into the command or query below using{' '}
            <Box component="span" fontFamily="monospace" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.72rem' }}>
              {'{{paramName}}'}
            </Box>
            . Arthur replaces it with the value sent by the MCP client at call time.
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

function mergeParams(detected: string[], existing: DbQueryParameter[]): DbQueryParameter[] {
  const map = new Map(existing.map((p) => [p.name, p]))
  return detected.map((name) => map.get(name) ?? { name, type: 'string' as const, required: true, description: '' })
}

function buildInputSchemaFromParams(params: DbQueryParameter[] = []): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []
  for (const param of params) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
      ...(param.default !== undefined ? { default: param.default } : {}),
    }
    if (param.required) required.push(param.name)
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) }
}

function parseJsonSchemaInput(raw: string): JsonSchema | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = JSON.parse(trimmed)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Schema must be a JSON object.')
  }
  return parsed as JsonSchema
}

function CodeEditor({ label, value, language, height = 160, helperText, onChange, onExpand }: {
  label: string
  value: string
  language: string
  height?: number | string
  helperText?: string
  onChange: (v: string) => void
  onExpand?: () => void
}) {
  const { mode } = useColorMode()
  const monacoOpts = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 8 },
  }
  return (
    <Box>
      <Box display="flex" alignItems="center" mb={0.5}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {onExpand && (
          <Tooltip title="Expand editor">
            <IconButton size="small" onClick={onExpand} sx={{ p: 0.25 }}>
              <IconArrowsMaximize size={14} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height }}>
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          theme={mode === 'dark' ? 'vs-dark' : 'light'}
          onChange={(v) => onChange(v ?? '')}
          options={monacoOpts}
        />
      </Box>
      {helperText && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {helperText}
        </Typography>
      )}
    </Box>
  )
}

function QueryDialog({ open, onClose, onSaved, projectId, sourceType, editQuery }: {
  open: boolean
  onClose: () => void
  onSaved: (q: DbQuery) => void
  projectId: string
  sourceType: string
  editQuery?: DbQuery | null
}) {
  const [form, setForm] = useState<Partial<DbQuery>>(emptyDbQuery(sourceType))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testArgs, setTestArgs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<unknown>(null)
  const [testError, setTestError] = useState('')
  const [outputSchemaText, setOutputSchemaText] = useState('')
  const [expandedField, setExpandedField] = useState<{ key: string; label: string; language: string } | null>(null)
  const { mode: colorMode } = useColorMode()

  useEffect(() => {
    if (open) {
      setForm(editQuery ? { ...editQuery } : emptyDbQuery(sourceType))
      setSaveError('')
      setTestResult(null)
      setTestError('')
      setTestOpen(false)
      setOutputSchemaText(editQuery?.outputSchema ? JSON.stringify(editQuery.outputSchema, null, 2) : '')
      setExpandedField(null)
    }
  }, [open, editQuery, sourceType])

  const getExpandedProps = (key: string): { value: string; onChange: (v: string) => void } | null => {
    switch (key) {
      case 'query': return { value: form.query ?? '', onChange: syncSqlParams }
      case 'filterTemplate': return { value: form.filterTemplate ?? '{}', onChange: (v) => syncTemplateParams('filterTemplate', v) }
      case 'projectionTemplate': return { value: form.projectionTemplate ?? '', onChange: (v) => syncTemplateParams('projectionTemplate', v) }
      case 'updateTemplate': return { value: form.updateTemplate ?? '{"$set": {}}', onChange: (v) => syncTemplateParams('updateTemplate', v) }
      case 'pipeline': return { value: form.pipeline ?? '[]', onChange: (v) => syncTemplateParams('pipeline', v) }
      case 'valueTemplate': return { value: form.valueTemplate ?? '', onChange: (v) => syncTemplateParams('valueTemplate', v) }
      case 'valuePattern': return { value: form.valuePattern ?? '', onChange: (v) => syncTemplateParams('valuePattern', v) }
      case 'esBodyTemplate': return { value: form.esBodyTemplate ?? '{}', onChange: (v) => syncTemplateParams('esBodyTemplate', v) }
      case 'gqlDocument': return { value: form.gqlDocument ?? '', onChange: syncGqlParams }
      case 'grpcRequestTemplate': return { value: form.grpcRequestTemplate ?? '{}', onChange: (v) => syncTemplateParams('grpcRequestTemplate', v) }
      case 'outputSchema': return { value: outputSchemaText, onChange: setOutputSchemaText }
      default: return null
    }
  }

  const expandedProps = expandedField ? getExpandedProps(expandedField.key) : null

  const setField = <K extends keyof DbQuery>(key: K, val: DbQuery[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const syncSqlParams = (query: string) => {
    const detected = detectSqlParamsFromQuery(query)
    setForm((prev) => ({
      ...prev,
      query,
      parameters: mergeParams(detected, prev.parameters ?? []),
    }))
  }

  const syncTemplateParams = (key: keyof DbQuery, val: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      const allText = [
        next.filterTemplate, next.projectionTemplate, next.updateTemplate,
        next.pipeline, next.esBodyTemplate, next.grpcRequestTemplate,
        next.keyPattern, next.valueTemplate,
      ].filter(Boolean).join(' ')
      const detected = detectTemplateParams(allText)
      return { ...next, parameters: mergeParams(detected, prev.parameters ?? []) }
    })
  }

  const syncGqlParams = (doc: string) => {
    const detected = detectGqlParams(doc)
    setForm((prev) => ({
      ...prev,
      gqlDocument: doc,
      parameters: mergeParams(detected, prev.parameters ?? []),
    }))
  }

  const handleSave = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const outputSchema = parseJsonSchemaInput(outputSchemaText)
      const body = {
        ...form,
        sourceType,
        inputSchema: buildInputSchemaFromParams(form.parameters ?? []),
        outputSchema,
      }
      let res: DbQuery
      if (editQuery) {
        const r = await api.put<DbQuery>(`/swagger/servers/${projectId}/queries/${editQuery.id}`, body)
        res = r.data
      } else {
        const r = await api.post<DbQuery>(`/swagger/servers/${projectId}/queries`, body)
        res = r.data
      }
      onSaved(res)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setSaveError(err?.response?.data?.message ?? (e instanceof Error ? e.message : 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setTestError('')
    try {
      let r: { data: { result: unknown; error?: string } }
      if (editQuery?.id) {
        // Existing operation — run by ID (picks up latest saved version)
        r = await api.post<{ result: unknown; error?: string }>(
          `/swagger/servers/${projectId}/queries/${editQuery.id}/run`,
          { args: testArgs },
        )
      } else {
        // New (unsaved) operation — run inline with current form state
        r = await api.post<{ result: unknown; error?: string }>(
          `/swagger/servers/${projectId}/run-query-inline`,
          { query: { ...form, sourceType, id: '__inline__' }, args: testArgs },
        )
      }
      if (r.data.error) setTestError(r.data.error)
      else setTestResult(r.data.result)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setTestError(err?.response?.data?.message ?? 'Run failed')
    } finally {
      setTesting(false)
    }
  }

  const isSql = SQL_SOURCES_SET.has(sourceType)
  const isMongo = sourceType === 'mongodb' || sourceType === 'firestore'
  const isRedis = sourceType === 'redis'
  const isDynamo = sourceType === 'dynamodb'
  const isEs = sourceType === 'elasticsearch'
  const isGql = sourceType === 'graphql'
  const isGrpc = sourceType === 'grpc'

  const REDIS_COMMANDS = ['GET', 'SET', 'HGET', 'HSET', 'LPUSH', 'LPOP', 'DEL', 'EXPIRE', 'TTL', 'KEYS', 'SCAN']
  const DYNAMO_OPS = ['getItem', 'putItem', 'updateItem', 'deleteItem', 'query', 'scan']
  const ES_OPS = ['search', 'get', 'index', 'update', 'delete']

  return (
    <>
    {expandedField && expandedProps && (
      <Drawer anchor="left" open={!!expandedField} onClose={() => setExpandedField(null)}
        PaperProps={{ sx: { width: 'calc(100vw - 580px)', display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography fontWeight={700} flexGrow={1}>{expandedField.label}</Typography>
          <Tooltip title="Collapse editor">
            <IconButton size="small" onClick={() => setExpandedField(null)}>
              <IconArrowsMinimize size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language={expandedField.language}
            value={expandedProps.value}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            onChange={(v) => expandedProps.onChange(v ?? '')}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12 },
            }}
          />
        </Box>
      </Drawer>
    )}
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 580 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2.5} py={2}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Typography fontWeight={700} fontSize="1rem">{editQuery ? 'Edit operation' : 'New operation'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box flexGrow={1} overflow="auto" px={2.5} py={2}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Name" value={form.name ?? ''} size="small" fullWidth required
            onChange={(e) => setField('name', e.target.value)} />
          <TextField label="Description" value={form.description ?? ''} size="small" fullWidth multiline minRows={4}
            onChange={(e) => setField('description', e.target.value)} />

          {/* Input parameters */}
          <ParamTable
            params={form.parameters ?? []}
            onParamChange={(params) => setField('parameters', params)}
          />

          {/* SQL */}
          {isSql && (
            <>
              <CodeEditor
                label="SQL Query"
                value={form.query ?? ''}
                language="sql"
                height={200}
                helperText="Use :paramName for parameters"
                onChange={syncSqlParams}
                onExpand={() => setExpandedField({ key: 'query', label: 'SQL Query', language: 'sql' })}
              />
              <FormControl size="small" sx={{ width: 220 }}>
                <InputLabel>Result mode</InputLabel>
                <Select value={form.resultMode ?? 'rows'} label="Result mode"
                  onChange={(e) => setField('resultMode', e.target.value as DbQuery['resultMode'])}>
                  <MenuItem value="rows">Rows (array)</MenuItem>
                  <MenuItem value="first">First row (object)</MenuItem>
                  <MenuItem value="count">Row count (integer)</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {/* MongoDB / Firestore */}
          {isMongo && (
            <>
              <TextField label="Collection" value={form.collection ?? ''} size="small" fullWidth required
                onChange={(e) => setField('collection', e.target.value)} />
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Operation type</InputLabel>
                <Select value={form.operationType ?? 'find'} label="Operation type"
                  onChange={(e) => setField('operationType', e.target.value as DbQuery['operationType'])}>
                  {['find', 'findOne', 'insertOne', 'updateOne', 'deleteOne', 'aggregate', 'count'].map((op) => (
                    <MenuItem key={op} value={op}>{op}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(form.operationType === 'find' || form.operationType === 'findOne' || form.operationType === 'updateOne' || form.operationType === 'deleteOne' || form.operationType === 'count') && (
                <CodeEditor
                  label='Filter template (JSON with {{param}} placeholders)'
                  value={form.filterTemplate ?? '{}'}
                  language="json"
                  height={140}
                  onChange={(v) => syncTemplateParams('filterTemplate', v)}
                  onExpand={() => setExpandedField({ key: 'filterTemplate', label: 'Filter template', language: 'json' })}
                />
              )}
              {(form.operationType === 'find' || form.operationType === 'findOne') && (
                <CodeEditor
                  label="Projection (optional JSON)"
                  value={form.projectionTemplate ?? ''}
                  language="json"
                  height={100}
                  onChange={(v) => syncTemplateParams('projectionTemplate', v)}
                  onExpand={() => setExpandedField({ key: 'projectionTemplate', label: 'Projection', language: 'json' })}
                />
              )}
              {form.operationType === 'insertOne' && (
                <CodeEditor
                  label='Document template (JSON with {{param}} placeholders)'
                  value={form.filterTemplate ?? '{}'}
                  language="json"
                  height={140}
                  onChange={(v) => syncTemplateParams('filterTemplate', v)}
                  onExpand={() => setExpandedField({ key: 'filterTemplate', label: 'Document template', language: 'json' })}
                />
              )}
              {form.operationType === 'updateOne' && (
                <CodeEditor
                  label='Update template (e.g. {"$set": {"name": "{{name}}"}})'
                  value={form.updateTemplate ?? '{"$set": {}}'}
                  language="json"
                  height={140}
                  onChange={(v) => syncTemplateParams('updateTemplate', v)}
                  onExpand={() => setExpandedField({ key: 'updateTemplate', label: 'Update template', language: 'json' })}
                />
              )}
              {form.operationType === 'aggregate' && (
                <CodeEditor
                  label="Pipeline stages (JSON array)"
                  value={form.pipeline ?? '[]'}
                  language="json"
                  height={160}
                  onChange={(v) => syncTemplateParams('pipeline', v)}
                  onExpand={() => setExpandedField({ key: 'pipeline', label: 'Pipeline stages', language: 'json' })}
                />
              )}
              {(form.operationType === 'find' || form.operationType === 'findOne') && (
                <Box display="flex" gap={2}>
                  <TextField label="Sort (optional JSON)" value={form.sortTemplate ?? ''} size="small" sx={{ flex: 1 }}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    onChange={(e) => setField('sortTemplate', e.target.value)} />
                  <TextField label="Limit" value={form.limitValue ?? ''} size="small" type="number" sx={{ width: 120 }}
                    onChange={(e) => setField('limitValue', e.target.value ? Number(e.target.value) : undefined)} />
                </Box>
              )}
            </>
          )}

          {/* Redis */}
          {isRedis && (() => {
            const tpl = form.redisTemplate ?? 'exact_key'
            return (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Operation type</InputLabel>
                  <Select value={tpl} label="Operation type"
                    onChange={(e) => {
                      setField('redisTemplate', e.target.value as DbQuery['redisTemplate'])
                      setForm((p) => ({ ...p, parameters: [] }))
                    }}>
                    <MenuItem value="exact_key">Exact key lookup</MenuItem>
                    <MenuItem value="key_prefix">Key prefix scan</MenuItem>
                    <MenuItem value="key_range">Key range (sorted set)</MenuItem>
                    <MenuItem value="search_by_value">Search by value</MenuItem>
                    <MenuItem value="secondary_index">Secondary index</MenuItem>
                    <MenuItem value="full_text">Full-text search (RediSearch)</MenuItem>
                    <MenuItem value="composite">Composite / custom command</MenuItem>
                  </Select>
                </FormControl>

                {tpl === 'exact_key' && (
                  <TextField label="Key" value={form.keyPattern ?? ''} size="small" fullWidth
                    placeholder="user:{{userId}}"
                    helperText="Use {{paramName}} — the exact key to read from Redis"
                    onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                )}

                {tpl === 'key_prefix' && (
                  <>
                    <TextField label="Key prefix" value={form.keyPattern ?? ''} size="small" fullWidth
                      placeholder="session:{{userId}}:"
                      helperText="Use {{paramName}} — scans all keys that start with this prefix"
                      onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                    <Box display="flex" gap={2} alignItems="center">
                      <TextField label="Limit (optional)" value={form.redisLimit ?? ''} size="small" type="number" sx={{ width: 160 }}
                        helperText="Max keys returned"
                        onChange={(e) => setField('redisLimit', e.target.value ? Number(e.target.value) : undefined)} />
                      <FormControlLabel
                        control={<Switch checked={form.redisFetchValues ?? false}
                          onChange={(e) => setField('redisFetchValues', e.target.checked)} size="small" />}
                        label={<Typography variant="body2">Fetch values</Typography>}
                      />
                    </Box>
                  </>
                )}

                {tpl === 'key_range' && (
                  <>
                    <TextField label="Sorted set key" value={form.keyPattern ?? ''} size="small" fullWidth
                      placeholder="leaderboard"
                      helperText="The sorted set key to query with ZRANGEBYSCORE"
                      onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                    <Box display="flex" gap={2}>
                      <TextField label="Min score" value={form.redisMinScore ?? ''} size="small" sx={{ flex: 1 }}
                        placeholder="-inf or {{minScore}}"
                        helperText="Use {{paramName}} or -inf"
                        onChange={(e) => { setField('redisMinScore', e.target.value); syncTemplateParams('redisMinScore', e.target.value) }} />
                      <TextField label="Max score" value={form.redisMaxScore ?? ''} size="small" sx={{ flex: 1 }}
                        placeholder="+inf or {{maxScore}}"
                        helperText="Use {{paramName}} or +inf"
                        onChange={(e) => { setField('redisMaxScore', e.target.value); syncTemplateParams('redisMaxScore', e.target.value) }} />
                      <TextField label="Limit" value={form.redisLimit ?? ''} size="small" type="number" sx={{ width: 120 }}
                        onChange={(e) => setField('redisLimit', e.target.value ? Number(e.target.value) : undefined)} />
                    </Box>
                  </>
                )}

                {tpl === 'search_by_value' && (
                  <>
                    <TextField label="Key prefix filter (optional)" value={form.keyPrefixFilter ?? ''} size="small" fullWidth
                      placeholder="session:*"
                      helperText="Limits the SCAN scope — leave blank to scan all keys"
                      onChange={(e) => setField('keyPrefixFilter', e.target.value)} />
                    <TextField label="Value contains" value={form.valuePattern ?? ''} size="small" fullWidth
                      placeholder="{{value}}"
                      helperText='Use {{paramName}} — returns all keys whose stored value contains this string'
                      onChange={(e) => syncTemplateParams('valuePattern', e.target.value)} />
                    <TextField label="Limit (optional)" value={form.redisLimit ?? ''} size="small" type="number" sx={{ width: 160 }}
                      onChange={(e) => setField('redisLimit', e.target.value ? Number(e.target.value) : undefined)} />
                  </>
                )}

                {tpl === 'secondary_index' && (
                  <>
                    <TextField label="Index key" value={form.keyPattern ?? ''} size="small" fullWidth
                      placeholder="idx:status:{{status}}"
                      helperText="A Redis Set whose members are the keys to return — use {{paramName}} for dynamic segments"
                      onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                    <FormControlLabel
                      control={<Switch checked={form.redisFetchValues ?? false}
                        onChange={(e) => setField('redisFetchValues', e.target.checked)} size="small" />}
                      label={<Typography variant="body2">Fetch values for each key (GET)</Typography>}
                    />
                  </>
                )}

                {tpl === 'full_text' && (
                  <>
                    <TextField label="RediSearch index name" value={form.redisFtIndex ?? ''} size="small" fullWidth
                      placeholder="products-idx"
                      helperText="The FT.CREATE index to search against"
                      onChange={(e) => setField('redisFtIndex', e.target.value)} />
                    <TextField label="Query" value={form.keyPattern ?? ''} size="small" fullWidth
                      placeholder="{{query}}"
                      helperText="RediSearch query syntax — use {{paramName}} for dynamic terms"
                      onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                    <TextField label="Limit (optional)" value={form.redisLimit ?? ''} size="small" type="number" sx={{ width: 160 }}
                      onChange={(e) => setField('redisLimit', e.target.value ? Number(e.target.value) : undefined)} />
                  </>
                )}

                {tpl === 'composite' && (
                  <>
                    <FormControl size="small" sx={{ width: 160 }}>
                      <InputLabel>Command</InputLabel>
                      <Select value={form.command ?? 'GET'} label="Command"
                        onChange={(e) => setField('command', e.target.value)}>
                        {REDIS_COMMANDS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField label="Key pattern" value={form.keyPattern ?? ''} size="small" fullWidth
                      placeholder="user:{{userId}}" helperText="Use {{paramName}} for parameters"
                      onChange={(e) => syncTemplateParams('keyPattern', e.target.value)} />
                    {['SET', 'HSET', 'LPUSH'].includes(form.command ?? '') && (
                      <CodeEditor
                        label="Value template"
                        value={form.valueTemplate ?? ''}
                        language="plaintext"
                        height={80}
                        onChange={(v) => syncTemplateParams('valueTemplate', v)}
                        onExpand={() => setExpandedField({ key: 'valueTemplate', label: 'Value template', language: 'plaintext' })}
                      />
                    )}
                  </>
                )}
              </>
            )
          })()}

          {/* DynamoDB */}
          {isDynamo && (
            <>
              <TextField label="Table name" value={form.tableName ?? ''} size="small" fullWidth required
                onChange={(e) => setField('tableName', e.target.value)} />
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Operation</InputLabel>
                <Select value={form.dynamoOperation ?? 'getItem'} label="Operation"
                  onChange={(e) => setField('dynamoOperation', e.target.value)}>
                  {DYNAMO_OPS.map((op) => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                </Select>
              </FormControl>
              <CodeEditor
                label="Key condition / filter (JSON with {{param}} placeholders)"
                value={form.filterTemplate ?? ''}
                language="json"
                height={140}
                onChange={(v) => syncTemplateParams('filterTemplate', v)}
                onExpand={() => setExpandedField({ key: 'filterTemplate', label: 'Key condition / filter', language: 'json' })}
              />
            </>
          )}

          {/* Elasticsearch */}
          {isEs && (
            <>
              <TextField label="Index" value={form.esIndex ?? ''} size="small" fullWidth required
                onChange={(e) => setField('esIndex', e.target.value)} />
              <FormControl size="small" sx={{ width: 160 }}>
                <InputLabel>Operation</InputLabel>
                <Select value={form.esOperation ?? 'search'} label="Operation"
                  onChange={(e) => setField('esOperation', e.target.value)}>
                  {ES_OPS.map((op) => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                </Select>
              </FormControl>
              <CodeEditor
                label="Body template (JSON with {{param}} placeholders)"
                value={form.esBodyTemplate ?? '{}'}
                language="json"
                height={160}
                onChange={(v) => syncTemplateParams('esBodyTemplate', v)}
                onExpand={() => setExpandedField({ key: 'esBodyTemplate', label: 'Body template', language: 'json' })}
              />
            </>
          )}

          {/* GraphQL */}
          {isGql && (
            <>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Operation type</InputLabel>
                <Select value={form.gqlOperationType ?? 'query'} label="Operation type"
                  onChange={(e) => setField('gqlOperationType', e.target.value as DbQuery['gqlOperationType'])}>
                  <MenuItem value="query">Query</MenuItem>
                  <MenuItem value="mutation">Mutation</MenuItem>
                </Select>
              </FormControl>
              <CodeEditor
                label="GraphQL document"
                value={form.gqlDocument ?? ''}
                language="graphql"
                height={200}
                onChange={syncGqlParams}
                onExpand={() => setExpandedField({ key: 'gqlDocument', label: 'GraphQL document', language: 'graphql' })}
              />
            </>
          )}

          {/* gRPC */}
          {isGrpc && (
            <>
              <Box display="flex" gap={2}>
                <TextField label="Service name" value={form.grpcService ?? ''} size="small" sx={{ flex: 1 }}
                  onChange={(e) => setField('grpcService', e.target.value)} />
                <TextField label="Method name" value={form.grpcMethod ?? ''} size="small" sx={{ flex: 1 }}
                  onChange={(e) => setField('grpcMethod', e.target.value)} />
              </Box>
              <CodeEditor
                label="Request template (JSON with {{param}} placeholders)"
                value={form.grpcRequestTemplate ?? '{}'}
                language="json"
                height={160}
                onChange={(v) => syncTemplateParams('grpcRequestTemplate', v)}
                onExpand={() => setExpandedField({ key: 'grpcRequestTemplate', label: 'Request template', language: 'json' })}
              />
            </>
          )}

          <Box>
            <Typography variant="subtitle2" mb={1}>Output schema</Typography>
            <CodeEditor
              label="Output Schema (JSON Schema)"
              value={outputSchemaText}
              language="json"
              height={200}
              helperText="Describe the normalized operation result returned to MCP clients."
              onChange={setOutputSchemaText}
              onExpand={() => setExpandedField({ key: 'outputSchema', label: 'Output Schema', language: 'json' })}
            />
          </Box>

          {/* Test panel — available in both create and edit modes */}
          <Box>
            <Button size="small" variant="outlined" startIcon={<IconPlayerPlay size={16} />}
              onClick={() => { setTestOpen((v) => !v); setTestResult(null); setTestError('') }}>
              {testOpen ? 'Hide test panel' : 'Try it out'}
            </Button>
            {!editQuery && testOpen && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Testing current (unsaved) definition
              </Typography>
            )}
            {testOpen && (
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                {(form.parameters ?? []).length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {(form.parameters ?? []).map((p) => (
                      <TextField key={p.name} size="small" label={`${p.name}${p.required ? ' *' : ''}`}
                        sx={{ width: 200 }}
                        value={testArgs[p.name] ?? ''}
                        onChange={(e) => setTestArgs((prev) => ({ ...prev, [p.name]: e.target.value }))} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" mb={1.5}>No parameters.</Typography>
                )}
                <Button size="small" variant="contained" startIcon={<IconPlayerPlay size={14} />}
                  onClick={handleTest} disabled={testing}>
                  {testing ? 'Running…' : 'Execute'}
                </Button>
                {testError && <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.8rem' }}>{testError}</Alert>}
                {testResult !== null && !testError && (
                  <Box mt={1.5} sx={{
                    maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.78rem',
                    bgcolor: '#1e1e1e', color: '#d4d4d4',
                    p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {JSON.stringify(testResult, null, 2)}
                  </Box>
                )}
              </Paper>
            )}
          </Box>

          {saveError && <Alert severity="error">{saveError}</Alert>}
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" gap={1} px={2.5} py={2}
        sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={saving || !form.name?.trim()}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Drawer>
    </>
  )
}

function QueriesTab({ projectId, sourceType, onQueriesChange }: {
  projectId: string
  sourceType: string
  onQueriesChange: (queries: DbQuery[]) => void
}) {
  const { can } = useAuth()
  const [queries, setQueries] = useState<DbQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editQuery, setEditQuery] = useState<DbQuery | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [runPanelId, setRunPanelId] = useState<string | null>(null)
  const [runArgs, setRunArgs] = useState<Record<string, string>>({})
  const [runResult, setRunResult] = useState<unknown>(null)
  const [runError, setRunError] = useState('')
  const [running, setRunning] = useState(false)
  const [introspectResult, setIntrospectResult] = useState<{ tables?: string[]; collections?: string[] } | null>(null)
  const [introspecting, setIntrospecting] = useState(false)

  const isSql = SQL_SOURCES_SET.has(sourceType)

  useEffect(() => {
    setLoading(true)
    api.get<DbQuery[]>(`/swagger/servers/${projectId}/queries`)
      .then((r) => {
        setQueries(r.data)
        onQueriesChange(r.data)
      })
      .catch(() => setQueries([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const syncQueries = (updated: DbQuery[]) => {
    setQueries(updated)
    onQueriesChange(updated)
  }

  const handleDelete = async (queryId: string) => {
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/queries/${queryId}`)
      syncQueries(queries.filter((q) => q.id !== queryId))
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleRun = async (query: DbQuery) => {
    setRunning(true)
    setRunResult(null)
    setRunError('')
    try {
      const r = await api.post<{ result: unknown; error?: string }>(
        `/swagger/servers/${projectId}/queries/${query.id}/run`,
        { args: runArgs },
      )
      if (r.data.error) setRunError(r.data.error)
      else setRunResult(r.data.result)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setRunError(err?.response?.data?.message ?? 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const handleIntrospect = async () => {
    setIntrospecting(true)
    setIntrospectResult(null)
    try {
      const res = await api.post<{ tables?: string[]; collections?: string[] }>(`/swagger/servers/${projectId}/introspect`)
      setIntrospectResult(res.data)
    } catch {
      setIntrospectResult({})
    } finally {
      setIntrospecting(false)
    }
  }

  const isMongo = sourceType === 'mongodb' || sourceType === 'firestore'
  const label = 'operation'
  const labelPlural = 'operations'

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Operations
        </Typography>
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" startIcon={<IconSearch size={16} />}
            onClick={handleIntrospect} disabled={introspecting}>
            {introspecting ? 'Introspecting…' : isMongo ? 'Discover collections' : 'Introspect schema'}
          </Button>
          {can(Permission.ToolsCreate) && (
            <Button size="small" variant="contained" startIcon={<IconPlus size={16} />}
              onClick={() => { setEditQuery(null); setDialogOpen(true) }}>
              Add {label}
            </Button>
          )}
        </Box>
      </Box>

      {introspectResult && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setIntrospectResult(null)}>
          {introspectResult.tables && introspectResult.tables.length > 0
            ? <>Tables: {introspectResult.tables.join(', ')}</>
            : introspectResult.collections && introspectResult.collections.length > 0
              ? <>Collections: {introspectResult.collections.join(', ')}</>
              : 'Nothing discovered. Check connection configuration.'}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : queries.length === 0 ? (
        <Alert severity="info">
          No {labelPlural} yet. Click "Add {label}" to define your first source operation, then create tools from it in the Tools tab.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 70 }}>Params</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 120 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queries.map((q) => (
                <>
                  <TableRow key={q.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography fontWeight={600} fontSize="0.85rem">{q.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: 'block' }}>
                        {q.description ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {isSql && (
                        <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
                          {(q.query ?? '').slice(0, 55)}{(q.query ?? '').length > 55 ? '…' : ''}
                        </Typography>
                      )}
                      {(sourceType === 'mongodb' || sourceType === 'firestore') && (
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Typography fontFamily="monospace" fontSize="0.8rem">{q.collection}</Typography>
                          <Chip label={q.operationType ?? '—'} size="small" />
                        </Box>
                      )}
                      {sourceType === 'redis' && (
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Chip label={q.command ?? '—'} size="small" />
                          <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary">{q.keyPattern}</Typography>
                        </Box>
                      )}
                      {sourceType === 'dynamodb' && (
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Typography fontFamily="monospace" fontSize="0.8rem">{q.tableName}</Typography>
                          <Chip label={q.dynamoOperation ?? '—'} size="small" />
                        </Box>
                      )}
                      {sourceType === 'elasticsearch' && (
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Typography fontFamily="monospace" fontSize="0.8rem">{q.esIndex}</Typography>
                          <Chip label={q.esOperation ?? '—'} size="small" />
                        </Box>
                      )}
                      {sourceType === 'graphql' && (
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Chip label={q.gqlOperationType ?? 'query'} size="small" />
                          <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {(q.gqlDocument ?? '').slice(0, 40)}{(q.gqlDocument ?? '').length > 40 ? '…' : ''}
                          </Typography>
                        </Box>
                      )}
                      {sourceType === 'grpc' && (
                        <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary">
                          {q.grpcService}.{q.grpcMethod}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={(q.parameters ?? []).length} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title={runPanelId === q.id ? 'Close run panel' : 'Run'}>
                          <IconButton size="small" color="primary"
                            onClick={() => {
                              if (runPanelId === q.id) { setRunPanelId(null) }
                              else { setRunPanelId(q.id); setRunArgs({}); setRunResult(null); setRunError('') }
                            }}>
                            <IconPlayerPlay size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditQuery(q); setDialogOpen(true) }}>
                            <IconEdit size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirm(q.id)}>
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {runPanelId === q.id && (
                    <TableRow key={`${q.id}-run`}>
                      <TableCell colSpan={5} sx={{ p: 0 }}>
                        <Box sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
                          <Typography variant="subtitle2" mb={1}>Run "{q.name}"</Typography>
                          {(q.parameters ?? []).length > 0 ? (
                            <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
                              {(q.parameters ?? []).map((p) => (
                                <TextField key={p.name} size="small" label={p.name}
                                  value={runArgs[p.name] ?? ''}
                                  onChange={(e) => setRunArgs((prev) => ({ ...prev, [p.name]: e.target.value }))}
                                  sx={{ width: 180 }} />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" mb={1}>No parameters.</Typography>
                          )}
                          <Button size="small" variant="contained" startIcon={<IconPlayerPlay size={14} />}
                            onClick={() => handleRun(q)} disabled={running}>
                            {running ? 'Running…' : 'Execute'}
                          </Button>
                          {runError && <Alert severity="error" sx={{ mt: 1 }}>{runError}</Alert>}
                          {runResult !== null && !runError && (
                            <Box mt={1} sx={{ maxHeight: 260, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem',
                              bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1 }}>
                              <pre style={{ margin: 0 }}>{JSON.stringify(runResult, null, 2)}</pre>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <QueryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(q) => {
          const updated = editQuery
            ? queries.map((x) => x.id === q.id ? q : x)
            : [...queries, q]
          syncQueries(updated)
          setDialogOpen(false)
        }}
        projectId={projectId}
        sourceType={sourceType}
        editQuery={editQuery}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${label}`}
        message={`Delete this ${label}? Tools referencing it will stop working. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm) }}
        onClose={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}

// ─── DbToolsTab ───────────────────────────────────────────────────────────────

interface DbToolForm {
  name: string
  description: string
  dbQueryId: string
  outputTemplate: string
}

function DbToolDialog({ open, onClose, onSaved, projectId, queries, editTool }: {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool) => void
  projectId: string
  queries: DbQuery[]
  editTool?: GeneratedTool | null
}) {
  const [form, setForm] = useState<DbToolForm>({ name: '', description: '', dbQueryId: '', outputTemplate: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const selectedQuery = queries.find((q) => q.id === form.dbQueryId) ?? null

  useEffect(() => {
    if (open) {
      if (editTool) {
        setForm({
          name: editTool.name,
          description: editTool.description ?? '',
          dbQueryId: editTool.executionRef?.dbQueryId ?? '',
          outputTemplate: editTool.outputTemplate ?? '',
        })
      } else {
        setForm({ name: '', description: '', dbQueryId: '', outputTemplate: '' })
      }
      setSaveError('')
    }
  }, [open, editTool])

  const handleSave = async () => {
    if (!form.name.trim() || !form.dbQueryId) return
    setSaving(true)
    setSaveError('')
    try {
      const inputSchema = selectedQuery?.inputSchema ?? buildInputSchemaFromParams(selectedQuery?.parameters ?? [])
      const body: Partial<GeneratedTool> = {
        name: form.name,
        description: form.description,
        inputSchema,
        outputSchema: selectedQuery?.outputSchema,
        executionRef: { type: 'db', dbQueryId: form.dbQueryId },
        outputTemplate: form.outputTemplate || undefined,
      }
      let res: GeneratedTool
      if (editTool) {
        const r = await api.put<GeneratedTool>(`/swagger/servers/${projectId}/tools/${editTool.name}`, body)
        res = r.data
      } else {
        const r = await api.post<GeneratedTool>(`/swagger/servers/${projectId}/tools`, body)
        res = r.data
      }
      onSaved(res)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setSaveError(err?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 520 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2.5} py={2}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Typography fontWeight={700} fontSize="1rem">{editTool ? 'Edit tool' : 'New tool'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box flexGrow={1} overflow="auto" px={2.5} py={2}>
        <Box display="flex" flexDirection="column" gap={2}>
          {queries.length === 0 ? (
            <Alert severity="warning">
              No operations defined yet. Create operations in the Operations tab first.
            </Alert>
          ) : (
            <>
              <TextField label="Tool name" value={form.name} size="small" fullWidth required
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <TextField label="Description" value={form.description} size="small" fullWidth multiline minRows={4}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <FormControl size="small" fullWidth required>
                <InputLabel>Select operation</InputLabel>
                <Select value={form.dbQueryId} label="Select operation"
                  onChange={(e) => setForm((p) => ({ ...p, dbQueryId: e.target.value }))}>
                  {queries.map((q) => (
                    <MenuItem key={q.id} value={q.id}>
                      <Box>
                        <Typography fontSize="0.85rem" fontWeight={600}>{q.name}</Typography>
                        {q.description && (
                          <Typography fontSize="0.75rem" color="text.secondary">{q.description}</Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedQuery && (selectedQuery.parameters ?? []).length > 0 && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Input schema will be built from {selectedQuery.parameters!.length} parameter{selectedQuery.parameters!.length !== 1 ? 's' : ''}: {selectedQuery.parameters!.map((p) => p.name).join(', ')}
                </Alert>
              )}
              {selectedQuery?.outputSchema && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Output schema will be copied from the selected operation.
                </Alert>
              )}
              <TextField label="Output template (optional Handlebars)" value={form.outputTemplate} size="small" fullWidth multiline minRows={3}
                placeholder="{{#each rows}}{{name}}: {{value}}{{/each}}"
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                onChange={(e) => setForm((p) => ({ ...p, outputTemplate: e.target.value }))} />
            </>
          )}
          {saveError && <Alert severity="error">{saveError}</Alert>}
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" gap={1} px={2.5} py={2}
        sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.dbQueryId || queries.length === 0}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Drawer>
  )
}

function DbToolsTab({ tools, projectId, queries, onToolAdded, onToolChanged, onToolDeleted }: {
  tools: GeneratedTool[]
  projectId: string
  queries: DbQuery[]
  onToolAdded: (tool: GeneratedTool) => void
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}) {
  const { can } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTool, setEditTool] = useState<GeneratedTool | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tryPanelTool, setTryPanelTool] = useState<string | null>(null)
  const [tryArgs, setTryArgs] = useState<Record<string, string>>({})
  const [tryResult, setTryResult] = useState<unknown>(null)
  const [tryError, setTryError] = useState('')
  const [trying, setTrying] = useState(false)

  const handleTry = async (tool: GeneratedTool) => {
    const dbQueryId = tool.executionRef?.dbQueryId
    if (!dbQueryId) return
    setTrying(true)
    setTryResult(null)
    setTryError('')
    try {
      const r = await api.post<{ result: unknown; error?: string }>(
        `/swagger/servers/${projectId}/queries/${dbQueryId}/run`,
        { args: tryArgs },
      )
      if (r.data.error) setTryError(r.data.error)
      else setTryResult(r.data.result)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setTryError(err?.response?.data?.message ?? 'Execution failed')
    } finally {
      setTrying(false)
    }
  }

  const dbTools = tools.filter((t) => t.executionRef?.type === 'db')
  const queryMap = new Map(queries.map((q) => [q.id, q]))

  const handleDelete = async (toolName: string) => {
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/tools/${toolName}`)
      onToolDeleted(toolName)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleToggleEnabled = async (tool: GeneratedTool) => {
    const updated = { ...tool, enabled: !tool.enabled }
    await api.patch(`/swagger/servers/${projectId}/tools/${tool.name}`, { enabled: updated.enabled })
    onToolChanged(tool.name, updated)
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>Tools</Typography>
        {can(Permission.ToolsCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />}
            onClick={() => { setEditTool(null); setDialogOpen(true) }}>
            New tool
          </Button>
        )}
      </Box>

      {queries.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Create operations first in the Operations tab, then come back to create tools.
        </Alert>
      )}

      {dbTools.length === 0 ? (
        <Alert severity="info">
          No tools yet. {queries.length > 0 ? 'Click "New tool" to expose an operation as an MCP tool.' : ''}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 60 }}>On</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Operation</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 80 }}>Params</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 100 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dbTools.map((tool) => {
                const refQuery = tool.executionRef?.dbQueryId ? queryMap.get(tool.executionRef.dbQueryId) : undefined
                const params = Object.entries(tool.inputSchema?.properties ?? {}) as [string, any][]
                const isTryOpen = tryPanelTool === tool.name
                return (
                  <>
                    <TableRow key={tool.name} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Switch size="small" checked={tool.enabled !== false} onChange={() => handleToggleEnabled(tool)} />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} fontSize="0.85rem">{tool.name}</Typography>
                        {tool.description && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 200 }}>
                            {tool.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {refQuery ? (
                          <Chip label={refQuery.name} size="small" color="primary" variant="outlined" />
                        ) : (
                          <Chip label="deleted operation" size="small" color="error" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={params.length} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title={isTryOpen ? 'Close' : 'Try it out'}>
                            <IconButton size="small" color="primary"
                              onClick={() => {
                                if (isTryOpen) { setTryPanelTool(null) }
                                else { setTryPanelTool(tool.name); setTryArgs({}); setTryResult(null); setTryError('') }
                              }}>
                              <IconPlayerPlay size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditTool(tool); setDialogOpen(true) }}>
                              <IconEdit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(tool.name)}>
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {isTryOpen && (
                      <TableRow key={`${tool.name}-try`}>
                        <TableCell colSpan={5} sx={{ p: 0 }}>
                          <Box sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
                            <Typography variant="subtitle2" mb={1.5}>Try "{tool.name}"</Typography>
                            {params.length > 0 ? (
                              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                {params.map(([name, schema]) => (
                                  <TextField key={name} size="small"
                                    label={`${name}${(tool.inputSchema?.required ?? []).includes(name) ? ' *' : ''}`}
                                    helperText={schema.description}
                                    sx={{ width: 200 }}
                                    value={tryArgs[name] ?? ''}
                                    onChange={(e) => setTryArgs((prev) => ({ ...prev, [name]: e.target.value }))} />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" mb={1.5}>No parameters.</Typography>
                            )}
                            <Button size="small" variant="contained"
                              startIcon={trying ? <CircularProgress size={13} color="inherit" /> : <IconPlayerPlay size={14} />}
                              onClick={() => handleTry(tool)} disabled={trying || !refQuery}>
                              {trying ? 'Running…' : 'Execute'}
                            </Button>
                            {!refQuery && (
                              <Typography variant="caption" color="error" sx={{ ml: 1 }}>Operation was deleted — cannot execute.</Typography>
                            )}
                            {tryError && <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.8rem' }}>{tryError}</Alert>}
                            {tryResult !== null && !tryError && (
                              <Box mt={1.5} sx={{
                                maxHeight: 320, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.78rem',
                                bgcolor: '#1e1e1e', color: '#d4d4d4',
                                p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>
                                {JSON.stringify(tryResult, null, 2)}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <DbToolDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(tool) => {
          if (editTool) onToolChanged(editTool.name, tool)
          else onToolAdded(tool)
          setDialogOpen(false)
        }}
        projectId={projectId}
        queries={queries}
        editTool={editTool}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete tool"
        message={`Delete "${deleteConfirm}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm) }}
        onClose={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}


// ─── StaticToolsTab (Blank / Static servers) ─────────────────────────────────

interface StaticParam { name: string; type: string; required?: boolean; description?: string }
interface StaticToolForm {
  name: string
  description: string
  responseTemplate: string
  mimeType: string
  params: StaticParam[]
}

function emptyStaticForm(): StaticToolForm {
  return { name: '', description: '', responseTemplate: '', mimeType: 'text/plain', params: [] }
}

function detectStaticParams(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
}

function StaticToolDialog({ open, onClose, onSaved, projectId, editTool }: {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool) => void
  projectId: string
  editTool?: GeneratedTool | null
}) {
  const [form, setForm] = useState<StaticToolForm>(emptyStaticForm())
  const [saving, setSaving] = useState(false)
  const [error, setSaveError] = useState('')
  const [tryOpen, setTryOpen] = useState(false)
  const [tryArgs, setTryArgs] = useState<Record<string, string>>({})
  const [tryResult, setTryResult] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editTool) {
      const ref = editTool.executionRef as { type: 'static'; responseTemplate: string; mimeType?: string } | undefined
      const props = editTool.inputSchema?.properties ?? {}
      setForm({
        name: editTool.name,
        description: editTool.description ?? '',
        responseTemplate: ref?.responseTemplate ?? '',
        mimeType: ref?.mimeType ?? 'text/plain',
        params: Object.entries(props).map(([n, s]: [string, any]) => ({
          name: n, type: s.type ?? 'string', required: (editTool.inputSchema?.required ?? []).includes(n), description: s.description,
        })),
      })
    } else {
      setForm(emptyStaticForm())
    }
    setSaveError('')
    setTryOpen(false)
    setTryResult(null)
  }, [open, editTool])

  const syncParams = (template: string) => {
    const detected = detectStaticParams(template)
    setForm(prev => ({
      ...prev,
      responseTemplate: template,
      params: detected.map(name => prev.params.find(p => p.name === name) ?? { name, type: 'string', required: false }),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true); setSaveError('')
    try {
      const inputSchema: any = {
        type: 'object',
        properties: Object.fromEntries(form.params.map(p => [p.name, { type: p.type, ...(p.description ? { description: p.description } : {}) }])),
        required: form.params.filter(p => p.required).map(p => p.name),
      }
      const body: Partial<GeneratedTool> = {
        name: form.name.trim(),
        description: form.description.trim(),
        inputSchema,
        executionRef: { type: 'static', responseTemplate: form.responseTemplate, mimeType: form.mimeType } as any,
      }
      let saved: GeneratedTool
      if (editTool) {
        const r = await api.patch<GeneratedTool>(`/swagger/servers/${projectId}/tools/${encodeURIComponent(editTool.name)}`, body)
        saved = r.data
      } else {
        const r = await api.post<GeneratedTool>(`/swagger/servers/${projectId}/tools`, body)
        saved = r.data
      }
      onSaved(saved)
      onClose()
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false) }
  }

  const previewResult = () => {
    const rendered = (form.responseTemplate ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) =>
      tryArgs[k] !== undefined ? tryArgs[k] : `{{${k}}}`)
    setTryResult(rendered)
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 580 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2.5} py={2}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Typography fontWeight={700} fontSize="1rem">{editTool ? 'Edit static tool' : 'New static tool'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box flexGrow={1} overflow="auto" px={2.5} py={2}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Tool name" value={form.name} size="small" fullWidth required
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <TextField label="Description" value={form.description} size="small" fullWidth
            multiline minRows={4} maxRows={10}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          <TextField
            label="Response template"
            value={form.responseTemplate}
            size="small" fullWidth multiline minRows={6} maxRows={20}
            placeholder={'Hello {{name}}, you have {{count}} messages.'}
            helperText="Use {{paramName}} for dynamic values. Parameters are detected automatically."
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            onChange={e => syncParams(e.target.value)}
          />

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>MIME type</InputLabel>
            <Select value={form.mimeType} label="MIME type"
              onChange={e => setForm(p => ({ ...p, mimeType: e.target.value }))}>
              <MenuItem value="text/plain">text/plain</MenuItem>
              <MenuItem value="text/html">text/html</MenuItem>
              <MenuItem value="application/json">application/json</MenuItem>
              <MenuItem value="text/markdown">text/markdown</MenuItem>
            </Select>
          </FormControl>

          {/* Auto-detected parameters */}
          {form.params.length > 0 && (
            <Box>
              <Typography variant="subtitle2" mb={1}>Parameters ({form.params.length} detected)</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {form.params.map((p, i) => (
                  <Box key={p.name} display="flex" gap={1} alignItems="center">
                    <TextField size="small" value={p.name} label="Name" sx={{ width: 160 }} inputProps={{ readOnly: true }} />
                    <FormControl size="small" sx={{ width: 130 }}>
                      <InputLabel>Type</InputLabel>
                      <Select value={p.type} label="Type"
                        onChange={e => setForm(prev => { const ps = [...prev.params]; ps[i] = { ...ps[i], type: e.target.value }; return { ...prev, params: ps } })}>
                        <MenuItem value="string">string</MenuItem>
                        <MenuItem value="number">number</MenuItem>
                        <MenuItem value="boolean">boolean</MenuItem>
                        <MenuItem value="array">array</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField size="small" value={p.description ?? ''} label="Description" sx={{ flexGrow: 1 }}
                      onChange={e => setForm(prev => { const ps = [...prev.params]; ps[i] = { ...ps[i], description: e.target.value }; return { ...prev, params: ps } })} />
                    <FormControlLabel control={
                      <Checkbox size="small" checked={!!p.required}
                        onChange={e => setForm(prev => { const ps = [...prev.params]; ps[i] = { ...ps[i], required: e.target.checked }; return { ...prev, params: ps } })} />
                    } label="Required" />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Preview panel */}
          <Box>
            <Button size="small" variant="outlined" startIcon={<IconPlayerPlay size={16} />}
              onClick={() => { setTryOpen(v => !v); setTryResult(null) }}>
              {tryOpen ? 'Hide preview' : 'Preview output'}
            </Button>
            {tryOpen && (
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                {form.params.length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
                    {form.params.map(p => (
                      <TextField key={p.name} size="small" label={`${p.name}${p.required ? ' *' : ''}`} sx={{ width: 180 }}
                        value={tryArgs[p.name] ?? ''}
                        onChange={e => setTryArgs(prev => ({ ...prev, [p.name]: e.target.value }))} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" mb={1.5}>No parameters — template renders as-is.</Typography>
                )}
                <Button size="small" variant="contained" startIcon={<IconPlayerPlay size={14} />} onClick={previewResult}>
                  Preview
                </Button>
                {tryResult !== null && (
                  <Box mt={1.5} sx={{
                    maxHeight: 260, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.82rem',
                    bgcolor: '#1e1e1e', color: '#d4d4d4', p: 1.5, borderRadius: 1,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {tryResult}
                  </Box>
                )}
              </Paper>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" gap={1} px={2.5} py={2}
        sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Drawer>
  )
}

function StaticToolsTab({ tools, projectId, onToolAdded, onToolChanged, onToolDeleted }: {
  tools: GeneratedTool[]
  projectId: string
  onToolAdded: (tool: GeneratedTool) => void
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}) {
  const { can } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTool, setEditTool] = useState<GeneratedTool | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tryPanelTool, setTryPanelTool] = useState<string | null>(null)
  const [tryArgs, setTryArgs] = useState<Record<string, string>>({})
  const [tryResult, setTryResult] = useState<string | null>(null)

  const staticTools = tools.filter(t => t.executionRef?.type === 'static')

  const handleDelete = async (toolName: string) => {
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/tools/${toolName}`)
      onToolDeleted(toolName)
    } finally { setDeleting(false); setDeleteConfirm(null) }
  }

  const handleToggle = async (tool: GeneratedTool) => {
    const updated = { ...tool, enabled: !tool.enabled }
    await api.patch(`/swagger/servers/${projectId}/tools/${tool.name}`, { enabled: updated.enabled })
    onToolChanged(tool.name, updated)
  }

  const preview = (tool: GeneratedTool) => {
    const ref = tool.executionRef as { type: 'static'; responseTemplate: string } | undefined
    const rendered = (ref?.responseTemplate ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) =>
      tryArgs[k] !== undefined ? tryArgs[k] : `{{${k}}}`)
    setTryResult(rendered)
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>Static Tools</Typography>
        {can(Permission.ToolsCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />}
            onClick={() => { setEditTool(null); setDialogOpen(true) }}>
            New tool
          </Button>
        )}
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Static tools return a fixed response — optionally interpolating parameter values via <code>{'{{paramName}}'}</code>. No external connection is needed.
      </Alert>

      {staticTools.length === 0 ? (
        <Alert severity="info">No static tools yet. Click "New tool" to create one.</Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 60 }}>On</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Template preview</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 80 }}>Params</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', width: 100 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staticTools.map(tool => {
                const ref = tool.executionRef as { type: 'static'; responseTemplate: string } | undefined
                const params = Object.entries(tool.inputSchema?.properties ?? {}) as [string, any][]
                const isTryOpen = tryPanelTool === tool.name
                return (
                  <>
                    <TableRow key={tool.name} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Switch size="small" checked={tool.enabled !== false} onChange={() => handleToggle(tool)} />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} fontSize="0.85rem">{tool.name}</Typography>
                        {tool.description && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 200 }}>
                            {tool.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography fontFamily="monospace" fontSize="0.76rem" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
                          {(ref?.responseTemplate ?? '').slice(0, 60)}{(ref?.responseTemplate ?? '').length > 60 ? '…' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={params.length} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title={isTryOpen ? 'Close preview' : 'Preview output'}>
                            <IconButton size="small" color="primary"
                              onClick={() => {
                                if (isTryOpen) { setTryPanelTool(null) }
                                else { setTryPanelTool(tool.name); setTryArgs({}); setTryResult(null) }
                              }}>
                              <IconPlayerPlay size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditTool(tool); setDialogOpen(true) }}>
                              <IconEdit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(tool.name)}>
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {isTryOpen && (
                      <TableRow key={`${tool.name}-try`}>
                        <TableCell colSpan={5} sx={{ p: 0 }}>
                          <Box sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
                            <Typography variant="subtitle2" mb={1.5}>Preview "{tool.name}"</Typography>
                            {params.length > 0 ? (
                              <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
                                {params.map(([name, schema]) => (
                                  <TextField key={name} size="small"
                                    label={`${name}${(tool.inputSchema?.required ?? []).includes(name) ? ' *' : ''}`}
                                    helperText={schema.description}
                                    sx={{ width: 180 }}
                                    value={tryArgs[name] ?? ''}
                                    onChange={e => setTryArgs(prev => ({ ...prev, [name]: e.target.value }))} />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" mb={1.5}>No parameters — renders as-is.</Typography>
                            )}
                            <Button size="small" variant="contained" startIcon={<IconPlayerPlay size={14} />}
                              onClick={() => preview(tool)}>
                              Preview
                            </Button>
                            {tryResult !== null && (
                              <Box mt={1.5} sx={{
                                maxHeight: 260, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.78rem',
                                bgcolor: '#1e1e1e', color: '#d4d4d4',
                                p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>
                                {tryResult}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <StaticToolDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={tool => {
          if (editTool) onToolChanged(editTool.name, tool)
          else onToolAdded(tool)
          setDialogOpen(false)
        }}
        projectId={projectId}
        editTool={editTool}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete tool"
        message={`Delete "${deleteConfirm}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm) }}
        onClose={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}

// ─── SchemaTab ────────────────────────────────────────────────────────────────

interface SchemaColumn { name: string; type: string; nullable: boolean }
interface SchemaTable { name: string; columns: SchemaColumn[] }
interface SchemaResult {
  tables?: SchemaTable[]
  collections?: string[]
  error?: string
}

function SchemaTab({ projectId, sourceType }: { projectId: string; sourceType: SourceType }) {
  const [result, setResult] = useState<SchemaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isSql = SQL_SOURCES_SET.has(sourceType)
  const isMongo = sourceType === 'mongodb' || sourceType === 'firestore'

  const entityLabel = isSql ? 'table' : isMongo ? 'collection' : 'resource'
  const entityLabelPlural = isSql ? 'Tables' : isMongo ? 'Collections' : 'Resources'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.post<SchemaResult>(`/swagger/servers/${projectId}/introspect`)
      setResult(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Introspection failed. Check your connection settings.')
    } finally {
      setLoading(false) }
  }

  useEffect(() => { load() }, [projectId])

  const tables: SchemaTable[] = result?.tables ?? []
  const collections: string[] = result?.collections ?? []

  const filteredTables = tables.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredCollections = collections.filter(c =>
    !search || c.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} gap={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={700}>{entityLabelPlural}</Typography>
          {result && (
            <Chip size="small" label={isSql ? `${tables.length} tables` : `${collections.length} collections`} />
          )}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {result && (
            <TextField size="small" placeholder={`Search ${entityLabel}s…`} value={search}
              onChange={e => setSearch(e.target.value)} sx={{ width: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }} />
          )}
          <Button size="small" variant="outlined" startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && !result && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* SQL: expandable table list with columns */}
      {isSql && filteredTables.length > 0 && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {filteredTables.map((table, i) => (
            <Box key={table.name} sx={{ borderBottom: i < filteredTables.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Box
                display="flex" alignItems="center" gap={1.5} px={2} py={1.5}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, userSelect: 'none' }}
                onClick={() => setExpanded(expanded === table.name ? null : table.name)}
              >
                <IconChevronRight size={16} style={{
                  transition: 'transform 0.15s',
                  transform: expanded === table.name ? 'rotate(90deg)' : 'none',
                  color: 'var(--mui-palette-text-secondary)',
                  flexShrink: 0,
                }} />
                <IconTable size={16} style={{ color: 'var(--mui-palette-primary-main)', flexShrink: 0 }} />
                <Typography fontWeight={600} fontSize="0.875rem" sx={{ flexGrow: 1 }}>{table.name}</Typography>
                <Chip size="small" label={`${table.columns.length} col${table.columns.length !== 1 ? 's' : ''}`}
                  sx={{ fontSize: '0.7rem', height: 20 }} />
              </Box>

              {expanded === table.name && (
                <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', pl: 6 }}>Column</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Nullable</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {table.columns.map(col => (
                        <TableRow key={col.name} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ pl: 6, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <IconColumns size={13} style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }} />
                              {col.name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={col.type} size="small"
                              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20, bgcolor: 'background.paper' }} />
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="0.78rem" color={col.nullable ? 'text.secondary' : 'error.main'}>
                              {col.nullable ? 'yes' : 'no'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          ))}
        </Paper>
      )}

      {isSql && result && filteredTables.length === 0 && !error && (
        <Alert severity="info">
          {tables.length === 0
            ? 'No tables found. Make sure your connection is correct and the database has tables.'
            : 'No tables match your search.'}
        </Alert>
      )}

      {/* Non-SQL: flat list of collections/resources */}
      {!isSql && filteredCollections.length > 0 && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {filteredCollections.map((name, i) => (
            <Box key={name} display="flex" alignItems="center" gap={1.5} px={2} py={1.5}
              sx={{ borderBottom: i < filteredCollections.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <IconTable size={16} style={{ color: 'var(--mui-palette-primary-main)', flexShrink: 0 }} />
              <Typography fontWeight={500} fontSize="0.875rem">{name}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {!isSql && result && filteredCollections.length === 0 && !error && (
        <Alert severity="info">
          {collections.length === 0
            ? `No ${entityLabelPlural.toLowerCase()} found. Make sure your connection is correct.`
            : `No ${entityLabelPlural.toLowerCase()} match your search.`}
        </Alert>
      )}
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<GeneratedTool | undefined>()
  const [prefillTool, setPrefillTool] = useState<GeneratedTool | undefined>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const [toolSearch, setToolSearch] = useState('')
  const [toolMethodFilter, setToolMethodFilter] = useState<string | null>(null)
  const [reimportOpen, setReimportOpen] = useState(false)
  const [reimportSuccess, setReimportSuccess] = useState<{ added: number; updated: number } | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<Project>(`/swagger/servers/${id}`)
      .then((r) => { setProject(r.data); setBaseUrl(r.data.baseUrl); setIsPaused(r.data.isPaused ?? false) })
      .catch(() => setError('Server not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const saveProjectInfo = async (field: 'name' | 'description', value: string) => {
    await api.patch(`/swagger/servers/${id}/info`, { [field]: value })
    setProject((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const handleOpenEdit = (tool: GeneratedTool) => { setEditingTool(tool); setPrefillTool(undefined); setDialogOpen(true) }
  const handlePickEndpoint = (tool: GeneratedTool) => { setPickerOpen(false); setEditingTool(undefined); setPrefillTool(tool); setDialogOpen(true) }

  const handleToolSaved = (savedTool: GeneratedTool, oldName?: string) => {
    setProject((prev) => {
      if (!prev) return prev
      if (oldName) {
        return { ...prev, tools: prev.tools.map((t) => t.name === oldName ? savedTool : t) }
      }
      return { ...prev, tools: [...prev.tools, savedTool] }
    })
  }

  const handleToolChanged = (oldName: string, newTool: GeneratedTool) => {
    setProject((prev) => {
      if (!prev) return prev
      return { ...prev, tools: prev.tools.map((t) => t.name === oldName ? newTool : t) }
    })
  }

  const handleDeleteTool = (toolName: string) => {
    setProject((prev) => {
      if (!prev) return prev
      return { ...prev, tools: prev.tools.filter((t) => t.name !== toolName) }
    })
  }

  /* ── Sidebar context sync — hooks must be before any early return ── */
  const { setServerDetail } = useServerNav()
  useEffect(() => {
    if (!project) return
    const st = getSourceType(project)
    const sd = SOURCE_DISPLAY[st]
    const db = isDbSource(st)
    const blank = isBlankSource(st)
    const Tidx = {
      connect: 0,
      apiEndpoints: (!db && !blank) ? 1 : -1,
      queries:  db ? 1 : -1,
      tools:    db ? 2 : (blank ? 1 : 2),
      resources:db ? 3 : (blank ? 2 : 3),
      prompts:  db ? 4 : (blank ? 3 : 4),
      chains:   db ? 5 : (blank ? 4 : 5),
      settings: db ? 6 : (blank ? 5 : 6),
      schema:   db ? 7 : -1,
      connection: db ? 8 : -1,
      activity: db ? 9 : (blank ? 6 : 7),
      aiView:   db ? 10 : (blank ? 7 : 8),
    }
    const items: ServerNavItem[] = [
      { label: 'Connect',      icon: <IconWorld size={16} />,         idx: Tidx.connect },
      ...(Tidx.apiEndpoints !== -1 ? [{ label: 'API Endpoints', icon: <IconRoute size={16} />, idx: Tidx.apiEndpoints, badge: project.tools.length || undefined }] : []),
      ...(Tidx.queries !== -1 ? [{ label: 'Operations', icon: <IconDatabase size={16} />, idx: Tidx.queries, badge: (project.dbQueries ?? []).length || undefined }] : []),
      { label: 'Tools',        icon: <IconTool size={16} />,          idx: Tidx.tools,     badge: project.tools.length || undefined },
      { label: 'Resources',    icon: <IconFile size={16} />,          idx: Tidx.resources, badge: (project.resources ?? []).length || undefined },
      { label: 'Prompts',      icon: <IconBulb size={16} />,          idx: Tidx.prompts,   badge: (project.prompts ?? []).length || undefined },
      { label: 'Chains',       icon: <IconArrowsShuffle size={16} />, idx: Tidx.chains,    disabled: true },
      { label: 'Settings',     icon: <IconAdjustments size={16} />,   idx: Tidx.settings },
      ...(Tidx.schema !== -1 ? [{ label: 'Schema',     icon: <IconTable size={16} />, idx: Tidx.schema }] : []),
      ...(Tidx.connection !== -1 ? [{ label: 'Connection', icon: <IconLink size={16} />, idx: Tidx.connection }] : []),
      { label: 'Activity',     icon: <IconChartBar size={16} />,      idx: Tidx.activity },
      { label: 'AI View',      icon: <IconBook size={16} />,          idx: Tidx.aiView },
    ]
    setServerDetail({ name: project.name, sourceEmoji: sd.emoji, sourceColor: sd.color, navItems: items, tab, onTabChange: setTab })
  })
  useEffect(() => () => setServerDetail(null), [])

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  }
  if (error || !project) {
    return <Box p={3}><Alert severity="error">{error || 'Error loading server.'}</Alert></Box>
  }

  const methodCounts = (project.tools ?? []).reduce<Record<string, number>>((acc, t) => {
    const m = t.endpointRef?.method ?? 'UNKNOWN'
    acc[m] = (acc[m] ?? 0) + 1
    return acc
  }, {})

  const availableMethods = Object.keys(methodCounts)
  const visibleTools = (project.tools ?? []).filter((t) => {
    const matchSearch = !toolSearch
      || t.name.toLowerCase().includes(toolSearch.toLowerCase())
      || (t.description ?? '').toLowerCase().includes(toolSearch.toLowerCase())
    const matchMethod = !toolMethodFilter || t.endpointRef?.method === toolMethodFilter
    return matchSearch && matchMethod
  })

  const sourceType = getSourceType(project)
  const sourceDisplay = SOURCE_DISPLAY[sourceType]
  const dbSource = isDbSource(sourceType)
  const blankSource = isBlankSource(sourceType)

  const T = {
    connect:      0,
    apiEndpoints: (!dbSource && !blankSource) ? 1 : -1,
    queries:      dbSource ? 1 : -1,
    tools:        dbSource ? 2 : (blankSource ? 1 : 2),
    resources:    dbSource ? 3 : (blankSource ? 2 : 3),
    prompts:      dbSource ? 4 : (blankSource ? 3 : 4),
    chains:       dbSource ? 5 : (blankSource ? 4 : 5),
    settings:     dbSource ? 6 : (blankSource ? 5 : 6),
    schema:       dbSource ? 7 : -1,
    connection:   dbSource ? 8 : -1,
    activity:     dbSource ? 9 : (blankSource ? 6 : 7),
    aiView:       dbSource ? 10 : (blankSource ? 7 : 8),
  }

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: '10px', overflow: 'hidden' }}>
        {/* Chips + actions row */}
        <Box
          display="flex" alignItems="center" gap={0.75} px={2} py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {isPaused
            ? <Chip label="Paused" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }} />
            : <Chip
                label={project.status === 'active' ? 'Active' : 'Error'}
                size="small"
                color={project.status === 'active' ? 'success' : 'error'}
                variant="outlined"
                sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
              />
          }
          <Chip
            label={`${sourceDisplay.emoji} ${sourceDisplay.label}`}
            size="small" variant="outlined"
            sx={{ fontWeight: 500, height: 22, fontSize: '0.7rem', borderColor: sourceDisplay.color, color: sourceDisplay.color }}
          />
          {project.version && (
            <Chip label={`v${project.version}`} size="small" variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }} />
          )}
          <Box flexGrow={1} />
          {can(Permission.ServersCreate) && !dbSource && !blankSource && (
            <Tooltip title="Upload a new version of the spec">
              <IconButton size="small" onClick={() => { setReimportOpen(true); setReimportSuccess(null) }}>
                <IconRefresh size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Name + description row */}
        <Box px={2} py={1.5}>
          <InlineEdit value={project.name} onSave={(v) => saveProjectInfo('name', v)}
            readOnly={!can(Permission.ServersEditSettings)} placeholder="Server name"
            fontSize="1.1rem" fontWeight={700} />
          <Box mt={0.25}>
            <InlineEdit value={project.description ?? ''} onSave={(v) => saveProjectInfo('description', v)}
              readOnly={!can(Permission.ServersEditSettings)} multiline
              placeholder="Add a short description…" emptyLabel="Add a short description…"
              fontSize="0.82rem" color="text.secondary" />
          </Box>
        </Box>
      </Paper>

      {reimportSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReimportSuccess(null)}>
          Done — <strong>{reimportSuccess.added}</strong> tool{reimportSuccess.added !== 1 ? 's' : ''} added,{' '}
          <strong>{reimportSuccess.updated}</strong> updated.
        </Alert>
      )}

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <Box>
            {/* ── Connect ─────────────────────────────────────────────────────── */}
            {tab === T.connect && (
              <>
                <McpEndpointBar projectId={id!} hasKeys={(project.mcpApiKeys ?? []).length > 0} />
                {can(Permission.ApiKeysView) && (
                  <ApiKeysPanel
                    projectId={id!}
                    initialKeys={project.mcpApiKeys ?? []}
                    onChange={(keys) => setProject((prev) => prev ? { ...prev, mcpApiKeys: keys } : prev)}
                  />
                )}
                <OAuthClientPanel
                  projectId={id!}
                  initialClientId={project.oauthClientId}
                  initialClientSecret={project.oauthClientSecret}
                  serverBase={window.location.origin}
                  onChange={(cid, csec) => setProject((prev) => prev ? { ...prev, oauthClientId: cid ?? undefined, oauthClientSecret: csec ?? undefined } : prev)}
                />
              </>
            )}

            {/* ── Tab: API Endpoints (non-DB only) ────────────────────────────── */}
            {T.apiEndpoints !== -1 && tab === T.apiEndpoints && (
              <ApiEndpointsTab
                tools={project.tools}
                projectId={id!}
                projectBaseUrl={project.baseUrl ?? ''}
                anyApiKey={project.mcpApiKeys?.[0]?.key}
                onToolAdded={(tool) => setProject((prev) => prev ? { ...prev, tools: [...prev.tools, tool] } : prev)}
                onToolChanged={handleToolChanged}
                onToolDeleted={handleDeleteTool}
              />
            )}

            {/* ── Tab: Operations (DB only) ───────────────────────────────────── */}
            {T.queries !== -1 && tab === T.queries && (
              <QueriesTab
                projectId={id!}
                sourceType={sourceType}
                onQueriesChange={(queries) => setProject((prev) => prev ? { ...prev, dbQueries: queries } : prev)}
              />
            )}

            {/* ── Tab: Tools ──────────────────────────────────────────────────── */}
            {tab === T.tools && (
              blankSource ? (
                <StaticToolsTab
                  tools={project.tools}
                  projectId={id!}
                  onToolAdded={(tool) => setProject((prev) => prev ? { ...prev, tools: [...prev.tools, tool] } : prev)}
                  onToolChanged={handleToolChanged}
                  onToolDeleted={handleDeleteTool}
                />
              ) : dbSource ? (
                <DbToolsTab
                  tools={project.tools}
                  projectId={id!}
                  queries={project.dbQueries ?? []}
                  onToolAdded={(tool) => setProject((prev) => prev ? { ...prev, tools: [...prev.tools, tool] } : prev)}
                  onToolChanged={handleToolChanged}
                  onToolDeleted={handleDeleteTool}
                />
              ) : (
                sourceType === 'graphql' || sourceType === 'grpc' ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '10px' }}>
                    <Typography variant="h6" mb={1}>{SOURCE_DISPLAY[sourceType].label} Tools</Typography>
                    <Typography color="text.secondary" variant="body2">
                      Tool editor for {SOURCE_DISPLAY[sourceType].label} is coming soon.
                    </Typography>
                  </Paper>
                ) : (
                  can(Permission.ToolsView) ? (
                    <>
                      <Grid container spacing={2} mb={3}>
                        <Grid item xs={6} sm={3}>
                          <StatCard label="Total tools" value={project.tools.length} color="#5D87FF" />
                        </Grid>
                        {!dbSource && Object.entries(methodCounts).map(([method, count]) => (
                          <Grid item xs={6} sm={3} key={method}>
                            <StatCard label={method} value={count} color={METHOD_COLOR[method]} />
                          </Grid>
                        ))}
                      </Grid>

                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight={700}>What your AI can do</Typography>
                          <HelpButton title="Tools">
                            <Typography variant="body2" gutterBottom>
                              Each tool is one specific action your AI can take — like "search for a contact", "create a ticket", or "get project status". The AI reads all the descriptions here and decides which tool to use based on what you ask it.
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Better descriptions = better AI.</strong> Instead of "Get user", write "Fetch a user account by ID — returns name, email, role, and status." The more specific, the more reliably the AI will use it correctly.
                            </Typography>
                            <Typography variant="body2">
                              Use <strong>Disable</strong> to hide a tool from the AI without deleting it. Useful when an endpoint is temporarily unavailable.
                            </Typography>
                          </HelpButton>
                        </Box>
                        {can(Permission.ToolsCreate) && (
                          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setPickerOpen(true)} size="small">
                            New tool
                          </Button>
                        )}
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                        <TextField
                          size="small" placeholder="Search by name or description…" value={toolSearch}
                          onChange={(e) => setToolSearch(e.target.value)} sx={{ width: 260 }}
                          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
                        />
                        {!dbSource && availableMethods.length > 1 && (
                          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                            <Chip label="All" size="small" clickable onClick={() => setToolMethodFilter(null)}
                              color={toolMethodFilter === null ? 'primary' : 'default'}
                              variant={toolMethodFilter === null ? 'filled' : 'outlined'} />
                            {availableMethods.map((m) => (
                              <Chip key={m} label={m} size="small" clickable
                                onClick={() => setToolMethodFilter(toolMethodFilter === m ? null : m)}
                                sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem',
                                  bgcolor: toolMethodFilter === m ? METHOD_COLOR[m] : 'transparent',
                                  color: toolMethodFilter === m ? '#fff' : METHOD_COLOR[m],
                                  borderColor: METHOD_COLOR[m] }}
                                variant="outlined" />
                            ))}
                          </Box>
                        )}
                        {(toolSearch || toolMethodFilter) && (
                          <Typography variant="body2" color="text.secondary" ml="auto">
                            {visibleTools.length} of {project.tools.length}
                          </Typography>
                        )}
                      </Box>

                      {project.tools.length === 0
                        ? <Alert severity="info">No tools yet. Click "Add tool" to create one, or use "Update tools from spec" to import from an OpenAPI file.</Alert>
                        : visibleTools.length === 0
                          ? <Alert severity="info">No tools match your search.</Alert>
                          : visibleTools.map((tool) => (
                              <ToolAccordion
                                key={tool.name}
                                tool={tool}
                                projectId={id!}
                                anyApiKey={project.mcpApiKeys?.[0]?.key}
                                onToolChanged={handleToolChanged}
                                onEditEndpoint={handleOpenEdit}
                              />
                            ))}
                    </>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
                      <Typography color="text.secondary" variant="h6">Access restricted</Typography>
                      <Typography color="text.secondary" variant="body2">You don't have permission to view tools.</Typography>
                    </Box>
                  )
                )
              )
            )}

            {/* ── Tab: Resources ──────────────────────────────────────────────── */}
            {tab === T.resources && (can(Permission.ResourcesView) ? (
              <ResourcesTab
                projectId={id!}
                initialResources={project.resources ?? []}
                tools={project.tools ?? []}
                onChange={(resources) => setProject((prev) => prev ? { ...prev, resources } : prev)}
                anyApiKey={project.mcpApiKeys?.[0]?.key}
              />
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
                <Typography color="text.secondary" variant="h6">Access restricted</Typography>
                <Typography color="text.secondary" variant="body2">You don't have permission to view resources.</Typography>
              </Box>
            ))}

            {/* ── Tab: Prompts ────────────────────────────────────────────────── */}
            {tab === T.prompts && (
              <PromptsTab
                projectId={id!}
                initialPrompts={project.prompts ?? []}
                onChange={(prompts) => setProject((prev) => prev ? { ...prev, prompts } : prev)}
                anyApiKey={project.mcpApiKeys?.[0]?.key}
              />
            )}

            {/* ── Tab: Chains ─────────────────────────────────────────────────── */}
            {tab === T.chains && (
              <ChainsTab
                projectId={id!}
                initialChains={project.chains ?? []}
                tools={project.tools ?? []}
                onChange={(chains) => setProject((prev) => prev ? { ...prev, chains } : prev)}
              />
            )}

            {/* ── Tab: Settings ───────────────────────────────────────────────── */}
            {tab === T.settings && (
              can(Permission.ServersEditSettings) ? <>
                {!dbSource && <BaseUrlPanel projectId={id!} initialValue={baseUrl} onChange={setBaseUrl} />}
                {!dbSource && (
                  <AuthConfigPanel
                    projectId={id!}
                    initialAuth={project.auth}
                    onChange={(auth) => setProject((prev) => prev ? { ...prev, auth } : prev)}
                  />
                )}
                <RateLimitPanel
                  projectId={id!}
                  initialRateLimit={project.rateLimit}
                  onChange={(rl) => setProject((prev) => prev ? { ...prev, rateLimit: rl } : prev)}
                />
                <ProjectControlsPanel
                  projectId={id!}
                  initialPaused={project.isPaused}
                  initialMaintenance={project.maintenanceMode}
                  initialAvailability={project.availabilityWindow}
                  onPausedChange={setIsPaused}
                />
                <AlertConfigPanel projectId={id!} initialConfig={project.alertConfig} />
                {!dbSource && (
                  <TenantConfigPanel
                    projectId={id!}
                    initialConfig={(project as any).tenantConfig}
                    toolParamSuggestions={(() => {
                      const seen = new Set<string>()
                      for (const tool of project.tools ?? []) {
                        for (const mapping of tool.endpointRef?.parameterMap ?? []) {
                          seen.add(mapping.originalName)
                        }
                      }
                      return Array.from(seen).sort()
                    })()}
                  />
                )}
              </> : (
                <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
                  <Typography color="text.secondary" variant="h6">Access restricted</Typography>
                  <Typography color="text.secondary" variant="body2">You don't have permission to manage server settings.</Typography>
                </Box>
              )
            )}

            {/* ── Tab: Schema (DB sources only) ───────────────────────────────── */}
            {T.schema !== -1 && tab === T.schema && (
              <SchemaTab projectId={id!} sourceType={sourceType} />
            )}

            {/* ── Tab: Connection (DB sources only) ───────────────────────────── */}
            {T.connection !== -1 && tab === T.connection && (
              <ConnectionTab
                projectId={id!}
                connectionConfig={project.connectionConfig}
                sourceType={sourceType}
                onUpdated={() => {
                  api.get<Project>(`/swagger/servers/${id}`).then((r) => {
                    setProject(r.data)
                  })
                }}
              />
            )}

            {/* ── Tab: Activity ───────────────────────────────────────────────── */}
            {tab === T.activity && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6" fontWeight={700}>Activity Log</Typography>
                  <HelpButton title="Activity Log">
                    <Typography variant="body2" gutterBottom>
                      Every request your AI made through this project, in order. Each row is one action — the tool used, whether it succeeded, and how long it took.
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2.5 }}>
                      <Box component="li"><Typography variant="body2"><strong>Green status</strong> — request succeeded.</Typography></Box>
                      <Box component="li"><Typography variant="body2"><strong>Red status</strong> — something went wrong. Check the error column for details.</Typography></Box>
                      <Box component="li"><Typography variant="body2"><strong>Response time</strong> — how long the external API took to reply. Over 3s turns orange.</Typography></Box>
                    </Box>
                    <Typography variant="body2">
                      Logs are kept for 7 days. They reset when the server restarts.
                    </Typography>
                  </HelpButton>
                </Box>
                <ProjectLogs projectId={id!} />
              </>
            )}

            {/* ── Tab: AI View ────────────────────────────────────────────────── */}
            {tab === T.aiView && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6" fontWeight={700}>What your AI sees</Typography>
                  <HelpButton title="What your AI sees">
                    <Typography variant="body2">
                      This is the exact list of tools and descriptions your AI receives when it connects. If the AI is not using a tool correctly, check its description here — clearer descriptions lead to better results.
                    </Typography>
                  </HelpButton>
                </Box>
                <McpDocsContent project={project as any} projectId={id!} />
              </>
            )}
      </Box>

      <ToolDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPrefillTool(undefined) }}
        onSaved={handleToolSaved}
        onDeleted={handleDeleteTool}
        projectId={id!}
        projectBaseUrl={baseUrl}
        editTool={editingTool}
        prefillFrom={prefillTool}
        allTools={project?.tools}
      />

      <FromEndpointPickerDialog
        open={pickerOpen}
        tools={project?.tools ?? []}
        onPick={handlePickEndpoint}
        onClose={() => setPickerOpen(false)}
      />

      <ReimportSpecDialog
        projectId={id!}
        open={reimportOpen}
        onClose={() => setReimportOpen(false)}
        onSuccess={(result) => {
          setReimportOpen(false)
          setReimportSuccess(result)
          api.get<Project>(`/swagger/servers/${id}`).then((r) => {
            setProject(r.data)
            setBaseUrl(r.data.baseUrl)
          })
        }}
      />
    </Box>
  )
}
