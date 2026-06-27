import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type {
  ParameterMapping, EndpointRef, JsonSchema, ToolComment, GeneratedTool,
  McpApiKeyEntry, McpResource, McpPrompt, ChainInputSource, ChainInputMapping,
  ChainStep, ToolChain, GlobalPrompt, Project, AuthType, AuthConfig,
  InlineEditProps, ParamEntry, HeaderEntry, ToolDialogProps, SaveStatus,
  RateLimitPanelProps, ScheduleEntry, TenantParamType, TenantParam,
  HbScalar, HbArray, ExecLog,
} from '../features/server/types'
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
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconPlus,
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconCloudUpload,
  IconCopy,
  IconTrash,
  IconEdit,
  IconChevronDown,
  IconFile,
  IconLock,
  IconLockOpen,
  IconTool,
  IconWorld,
  IconBook,
  IconChartBar,
  IconGauge,
  IconKey,
  IconPlayerPlay,
  IconPlayerPause,
  IconShare,
  IconBell,
  IconClock,
  IconMessage,
  IconQrcode,
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
} from '@tabler/icons-react'
import { QRCodeSVG } from 'qrcode.react'
import MonacoEditor from '@monaco-editor/react'
import { useColorMode } from '../theme/ColorModeContext'
import { useAuth, Permission } from '../context/AuthContext'
import api from '../api'
import HelpButton from '../components/HelpButton'
import ConfirmDialog from '../components/ConfirmDialog'
import { McpDocsContent } from './McpDocs'
import SecretAutocomplete, { SecretEntry, useSecrets } from '../components/SecretAutocomplete'

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

import { InlineEdit } from '../features/server/settings/InlineEdit'
// ─── BaseUrl panel ────────────────────────────────────────────────────────────

function BaseUrlPanel({ projectId, initialValue, onChange }: {
  projectId: string; initialValue: string; onChange: (url: string) => void
}) {
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!editing) setValue(initialValue) }, [initialValue, editing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) { setError('The URL cannot be empty.'); return }
    try { new URL(trimmed) } catch { setError('Invalid URL. Include protocol (e.g. https://api.example.com)'); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/swagger/servers/${projectId}/base-url`, { baseUrl: trimmed })
      onChange(trimmed); setEditing(false)
    } catch { setError('Failed to save. Please try again.') } finally { setSaving(false) }
  }

  const handleCancel = () => { setValue(initialValue); setEditing(false); setError('') }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconWorld size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>API Base URL</Typography>
          <HelpButton title="API Base URL">
            <Typography variant="body2" gutterBottom>
              The root address of the external API this server connects to. Every tool call is prefixed with this URL — for example, base <code>https://api.example.com</code> + tool path <code>/users/42</code> makes a full request to <code>https://api.example.com/users/42</code>.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>When to update this field:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">Switching environments: staging → production (just change the URL, keep all tools).</Typography></Box>
              <Box component="li"><Typography variant="body2">The API migrated to a new domain or subdomain.</Typography></Box>
              <Box component="li"><Typography variant="body2">You want to test the same tools against a different server version.</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>
              The URL must include the protocol (<code>https://</code> or <code>http://</code>) and must not end with a trailing slash. Path parameters and query strings should <em>not</em> be included here — they belong in individual tool definitions.
            </Typography>
            <Typography variant="body2">
              Changes take effect immediately for all subsequent tool calls. In-flight calls are not affected.
            </Typography>
          </HelpButton>
        </Box>

        {editing ? (
          <TextField
            size="small" fullWidth autoFocus
            label="ExternalAPI Base URL" value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            error={!!error} helperText={error || 'Base URL used for all HTTP calls in this server'}
            placeholder="https://api.example.com"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Save"><span>
                    <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
                      {saving ? <CircularProgress size={14} /> : <IconCheck size={18} />}
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={handleCancel} disabled={saving}><IconX size={18} /></IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        ) : (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography
              fontFamily="monospace" fontSize="0.85rem" color="text.secondary"
              sx={{ wordBreak: 'break-all', flexGrow: 1 }}
            >
              {initialValue || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No base URL set</span>}
            </Typography>
            {can(Permission.ServersEditSettings) && (
              <Tooltip title="Edit Base URL">
                <IconButton size="small" onClick={() => setEditing(true)}><IconEdit size={15} /></IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  )
}

import { McpEndpointBar } from '../features/server/connect/McpEndpointBar'
import { ApiKeysPanel } from '../features/server/connect/ApiKeysPanel'
import { OAuthClientPanel } from '../features/server/connect/OAuthClientPanel'
import { EndpointAccordion } from '../features/server/api-endpoints/EndpointAccordion'
import { ApiEndpointsTab } from '../features/server/api-endpoints/ApiEndpointsTab'
import { ReimportSpecDialog } from '../features/server/api-endpoints/ReimportSpecDialog'
// ─── Tool dialog (create / edit endpoint) ────────────────────────────────────

import { emptyParam, emptyHeader, toolToFormState } from '../features/server/api-endpoints/tool-form-utils'
import { SaveIndicator } from '../components/SaveIndicator'


// ─── Rate limit panel ─────────────────────────────────────────────────────────

function RateLimitPanel({ projectId, initialRateLimit, onChange }: RateLimitPanelProps) {
  const [enabled, setEnabled] = useState(initialRateLimit?.enabled ?? false)
  const [rpm, setRpm] = useState(initialRateLimit?.requestsPerMinute ?? 60)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ enabled: boolean; requestsPerMinute: number } | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: { enabled: boolean; requestsPerMinute: number }, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      if (p.requestsPerMinute < 1 || p.requestsPerMinute > 10000) {
        setSaveError('Value must be between 1 and 10,000.'); setSaveStatus('error'); return
      }
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/rate-limit`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleEnabledChange = (val: boolean) => {
    setEnabled(val)
    scheduleSave({ enabled: val, requestsPerMinute: rpm }, 0)
  }

  const handleRpmChange = (val: number) => {
    setRpm(val)
    scheduleSave({ enabled, requestsPerMinute: val }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ color: enabled ? 'warning.main' : 'text.disabled', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconGauge size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>Request Limit</Typography>
            <HelpButton title="Request Limit">
              <Typography variant="body2" gutterBottom>
                Caps the number of MCP requests this server accepts per minute. When the limit is exceeded, the server responds with <strong>HTTP 429 (Too Many Requests)</strong> and a <code>Retry-After</code> header — the AI client should wait before retrying.
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Why set a rate limit?</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Protect the upstream API:</strong> many APIs have their own rate limits. Staying within them prevents your API credentials from being throttled or suspended.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Control costs:</strong> every call to a paid API costs money. A rate limit prevents AI agents from accidentally making thousands of calls in a loop.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Prevent runaway agents:</strong> AI agents in agentic workflows can sometimes get stuck in retry loops. A rate limit acts as a circuit breaker.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Fair usage:</strong> if multiple AI clients share this endpoint, a limit ensures no single client monopolises the quota.</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>How to set the right limit:</strong> check your upstream API's documented rate limit (e.g. 100 req/min) and set Arthur's limit slightly below it to leave headroom. Start conservative and increase if the AI frequently hits 429.
              </Typography>
              <Typography variant="body2">
                Toggle the switch to <strong>Inactive</strong> to disable rate limiting entirely. Changes save automatically.
              </Typography>
            </HelpButton>
          </Box>
          <SaveIndicator status={saveStatus} error={saveError} />
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch size="small" checked={enabled} onChange={(e) => handleEnabledChange(e.target.checked)} color="warning" />
            }
            label={<Typography variant="body2">{enabled ? 'Active' : 'Inactive'}</Typography>}
            sx={{ mr: 0 }}
          />
          <TextField
            size="small" type="number" label="Req / min"
            value={rpm} disabled={!enabled}
            onChange={(e) => handleRpmChange(Number(e.target.value))}
            inputProps={{ min: 1, max: 10000 }}
            sx={{ width: 130 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {enabled
            ? `Limits MCP server calls to ${rpm} req/min. Exceeding the limit returns HTTP 429.`
            : 'No request limit. Enable to restrict usage per minute.'}
        </Typography>
      </Box>
    </Paper>
  )
}

// ─── Auth config panel ────────────────────────────────────────────────────────

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'None (public API)',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  basic: 'Basic Auth (username/password)',
  'oauth2-client': 'OAuth2 Client Credentials',
  custom: 'Custom headers',
}

function AuthConfigPanel({ projectId, initialAuth, onChange }: {
  projectId: string
  initialAuth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}) {
  const [authType, setAuthType] = useState<AuthType>((initialAuth?.type as AuthType) ?? 'none')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const { secrets, loading: loadingSecrets } = useSecrets()

  // bearer
  const [token, setToken] = useState((initialAuth as any)?.token ?? '')
  // api-key
  const [keyName, setKeyName] = useState((initialAuth as any)?.name ?? '')
  const [keyValue, setKeyValue] = useState((initialAuth as any)?.value ?? '')
  const [keyIn, setKeyIn] = useState<'header' | 'query'>((initialAuth as any)?.in ?? 'header')
  // basic
  const [basicUser, setBasicUser] = useState((initialAuth as any)?.username ?? '')
  const [basicPass, setBasicPass] = useState((initialAuth as any)?.password ?? '')
  // oauth2-client
  const [oauthTokenUrl, setOauthTokenUrl] = useState((initialAuth as any)?.tokenUrl ?? '')
  const [oauthClientId, setOauthClientId] = useState((initialAuth as any)?.clientId ?? '')
  const [oauthClientSecret, setOauthClientSecret] = useState((initialAuth as any)?.clientSecret ?? '')
  const [oauthScope, setOauthScope] = useState((initialAuth as any)?.scope ?? '')
  // custom headers
  const [customHeaders, setCustomHeaders] = useState<{ name: string; value: string }[]>(
    (initialAuth as any)?.headers ?? [{ name: '', value: '' }]
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<AuthConfig | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: AuthConfig, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/auth`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleAuthTypeChange = (newType: AuthType) => {
    setAuthType(newType)
    let payload: AuthConfig
    switch (newType) {
      case 'bearer': payload = { type: 'bearer', token }; break
      case 'api-key': payload = { type: 'api-key', name: keyName, value: keyValue, in: keyIn }; break
      case 'basic': payload = { type: 'basic', username: basicUser, password: basicPass }; break
      case 'oauth2-client': payload = { type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }; break
      case 'custom': payload = { type: 'custom', headers: customHeaders.filter(h => h.name.trim()) }; break
      default: payload = { type: 'none' }
    }
    scheduleSave(payload, 0)
  }

  const secretInput = (value: string, onChg: (v: string) => void, label: string) => (
    <SecretAutocomplete
      value={value}
      onChange={onChg}
      label={label}
      secrets={secrets}
      loadingSecrets={loadingSecrets}
    />
  )

  const addCustomHeader = () => setCustomHeaders(prev => [...prev, { name: '', value: '' }])
  const removeCustomHeader = (i: number) => {
    const next = customHeaders.filter((_, idx) => idx !== i)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 0)
  }
  const updateCustomHeader = (i: number, field: 'name' | 'value', val: string) => {
    const next = customHeaders.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconKey size={18} />
          <Typography variant="subtitle2" fontWeight={700}>API Credentials</Typography>
          {authType !== 'none' && (
            <Chip label={AUTH_TYPE_LABELS[authType]} size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
          <HelpButton title="API Authentication">
            <Typography variant="body2" gutterBottom>
              The credentials Arthur automatically attaches to every <strong>outgoing HTTP request</strong> when calling the upstream API on behalf of an AI tool call. The AI never sees or handles these credentials — Arthur injects them invisibly.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Choose the mode that matches your API's requirements:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              {([
                ['None', 'Public API — no credentials are attached. Use for unauthenticated endpoints.'],
                ['Bearer Token', 'Adds the header Authorization: Bearer <token>. Most modern REST APIs and OAuth2 resource servers use this.'],
                ['API Key', 'Adds the key as a custom header (e.g. X-API-Key) or as a query parameter. Check your API\'s documentation for the exact field name.'],
                ['Basic Auth', 'Adds Authorization: Basic <base64(username:password)>. Used by some legacy APIs and services like Jira or Confluence.'],
                ['OAuth2 Client Credentials', 'Arthur fetches a Bearer token automatically using your client ID and secret, and renews it before it expires. Use for machine-to-machine integrations where no user is involved.'],
                ['Custom Headers', 'Add any arbitrary HTTP headers. Useful for APIs with non-standard authentication schemes or when you need to pass multiple headers (e.g. X-Tenant-Id + X-Auth-Token).'],
              ] as [string,string][]).map(([label, desc]) => (
                <Box component="li" key={label} sx={{ mb: 0.5 }}>
                  <Typography variant="body2"><strong>{label}:</strong> {desc}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Important security note:</strong> credentials are stored encrypted in the database. Use tokens and keys with the <em>minimum required scope</em> — if a credential is exposed, a limited-scope key reduces the blast radius.
            </Typography>
            <Typography variant="body2">
              These credentials are completely separate from the <strong>MCP Authentication key</strong> (which protects the MCP endpoint). One controls who can call Arthur; the other controls how Arthur calls your API.
            </Typography>
          </HelpButton>
        </Box>
        <SaveIndicator status={saveStatus} error={saveError} />
      </Box>

      {/* Type selector */}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Authentication type</InputLabel>
        <Select
          value={authType}
          label="Authentication type"
          onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
        >
          {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
            <MenuItem key={t} value={t}>{AUTH_TYPE_LABELS[t]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic fields */}
      {authType === 'none' && (
        <Typography variant="body2" color="text.secondary" fontSize="0.82rem">
          The API is public and does not require authentication. No header will be added.
        </Typography>
      )}

      {authType === 'bearer' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {secretInput(token, (v) => { setToken(v); scheduleSave({ type: 'bearer', token: v }) }, 'Bearer Token')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Bearer {'<token>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'api-key' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <TextField size="small" fullWidth label="Parameter name" placeholder="X-Api-Key"
                value={keyName}
                onChange={(e) => { setKeyName(e.target.value); scheduleSave({ type: 'api-key', name: e.target.value, value: keyValue, in: keyIn }) }}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              {secretInput(keyValue, (v) => { setKeyValue(v); scheduleSave({ type: 'api-key', name: keyName, value: v, in: keyIn }) }, 'Value')}
            </Grid>
          </Grid>
          <FormControl size="small" fullWidth>
            <InputLabel>Send as</InputLabel>
            <Select value={keyIn} label="Send as"
              onChange={(e) => { const v = e.target.value as 'header' | 'query'; setKeyIn(v); scheduleSave({ type: 'api-key', name: keyName, value: keyValue, in: v }, 0) }}>
              <MenuItem value="header">Header HTTP</MenuItem>
              <MenuItem value="query">Query param (?{keyName || 'key'}=…)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {keyIn === 'header'
              ? `Sent as: ${keyName || '<name>'}: <value>`
              : `Added to URL: ?${keyName || '<name>'}=<value>`}
          </Typography>
        </Box>
      )}

      {authType === 'basic' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Username"
            value={basicUser}
            onChange={(e) => { setBasicUser(e.target.value); scheduleSave({ type: 'basic', username: e.target.value, password: basicPass }) }}
          />
          {secretInput(basicPass, (v) => { setBasicPass(v); scheduleSave({ type: 'basic', username: basicUser, password: v }) }, 'Password')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Basic {'<base64(username:password)>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'oauth2-client' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Token URL (token endpoint)"
            placeholder="https://auth.example.com/oauth/token"
            value={oauthTokenUrl}
            onChange={(e) => { setOauthTokenUrl(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: e.target.value, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
          />
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Client ID"
                value={oauthClientId}
                onChange={(e) => { setOauthClientId(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: e.target.value, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {secretInput(oauthClientSecret, (v) => { setOauthClientSecret(v); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: v, scope: oauthScope || undefined }) }, 'Client Secret')}
            </Grid>
          </Grid>
          <TextField size="small" fullWidth label="Scope (optional)" placeholder="read write"
            value={oauthScope}
            onChange={(e) => { setOauthScope(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: e.target.value || undefined }) }}
          />
          <Typography variant="caption" color="text.secondary">
            Uses <strong>client_credentials</strong>. Token is fetched automatically and renewed when it expires.
          </Typography>
        </Box>
      )}

      {authType === 'custom' && (
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="caption" color="text.secondary" mb={0.5}>
            Add any HTTP header to the request (e.g. <code>X-Tenant-Id</code>, <code>X-Auth-Token</code>).
          </Typography>
          {customHeaders.map((h, i) => (
            <Box key={i} display="flex" gap={1} alignItems="flex-start">
              <TextField size="small" label="Header" placeholder="X-Custom-Header" sx={{ flex: 1 }}
                value={h.name} onChange={(e) => updateCustomHeader(i, 'name', e.target.value)} />
              <Box sx={{ flex: 2 }}>
                <SecretAutocomplete
                  value={h.value}
                  onChange={(v) => updateCustomHeader(i, 'value', v)}
                  label="Value"
                  secrets={secrets}
                  loadingSecrets={loadingSecrets}
                />
              </Box>
              <IconButton size="small" color="error" onClick={() => removeCustomHeader(i)}
                disabled={customHeaders.length === 1} sx={{ mt: 0.5 }}>
                <IconTrash size={18} />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<IconPlus size={18} />} onClick={addCustomHeader} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            Add header
          </Button>
        </Box>
      )}

      {authType !== 'none' && (
        <Alert severity="warning" sx={{ mt: 2, py: 0.5, fontSize: '0.78rem' }}>
          Credentials are stored in the database. Use tokens with minimum required scope.
        </Alert>
      )}
    </Paper>
  )
}

// ─── Project Controls Panel (pause / maintenance / availability) ──────────────

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

function ProjectControlsPanel({ projectId, initialPaused, initialMaintenance, initialAvailability, onPausedChange }: {
  projectId: string
  initialPaused?: boolean
  initialMaintenance?: { enabled: boolean; message: string }
  initialAvailability?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  onPausedChange: (v: boolean) => void
}) {
  const [paused, setPaused] = useState(initialPaused ?? false)
  const [pauseSaving, setPauseSaving] = useState(false)
  const { can } = useAuth()

  const [maintEnabled, setMaintEnabled] = useState(initialMaintenance?.enabled ?? false)
  const [maintMsg, setMaintMsg] = useState(initialMaintenance?.message ?? '')
  const [maintSave, setMaintSave] = useState<SaveStatus>('idle')

  const [avEnabled, setAvEnabled] = useState(initialAvailability?.enabled ?? false)
  const [avTz, setAvTz] = useState(initialAvailability?.timezone ?? 'UTC')
  const [avSchedule, setAvSchedule] = useState<ScheduleEntry[]>(
    (initialAvailability?.schedule ?? []).map(e => ({ ...e, id: crypto.randomUUID() }))
  )
  const [avSave, setAvSave] = useState<SaveStatus>('idle')

  const maintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePause = async (val: boolean) => {
    setPauseSaving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/pause`, { isPaused: val })
      setPaused(val)
      onPausedChange(val)
    } finally { setPauseSaving(false) }
  }

  const scheduleMaint = (enabled: boolean, message: string) => {
    if (maintTimer.current) clearTimeout(maintTimer.current)
    maintTimer.current = setTimeout(async () => {
      setMaintSave('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/maintenance`, { enabled, message })
        setMaintSave('saved'); setTimeout(() => setMaintSave('idle'), 2000)
      } catch { setMaintSave('error') }
    }, 700)
  }

  const saveAv = (enabled: boolean, timezone: string, schedule: ScheduleEntry[]) => {
    if (avTimer.current) clearTimeout(avTimer.current)
    avTimer.current = setTimeout(async () => {
      setAvSave('saving')
      try {
        const payload = { enabled, timezone, schedule: schedule.map(({ day, startHour, endHour }) => ({ day, startHour, endHour })) }
        await api.patch(`/swagger/servers/${projectId}/availability`, payload)
        setAvSave('saved'); setTimeout(() => setAvSave('idle'), 2000)
      } catch { setAvSave('error') }
    }, 700)
  }

  const addEntry = () => {
    const next = [...avSchedule, { id: crypto.randomUUID(), day: 1, startHour: 9, endHour: 18 }]
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const removeEntry = (id: string) => {
    const next = avSchedule.filter(e => e.id !== id)
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const updateEntry = (id: string, field: keyof Omit<ScheduleEntry, 'id'>, value: number) => {
    const next = avSchedule.map(e => e.id === id ? { ...e, [field]: value } : e)
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const hours = Array.from({ length: 25 }, (_, i) => i)
  const fmtHour = (h: number) => h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* Pause */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        {paused ? <IconPlayerPause size={20} style={{ color: '#FFAE1F' }} /> : <IconPlayerPlay size={20} style={{ color: '#13DEB9' }} />}
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {paused ? 'Server is paused — AI cannot use it right now' : 'Server is running normally'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {paused ? 'All MCP requests return a 503 error until you resume.' : 'Your AI assistant can call tools in this server.'}
          </Typography>
        </Box>
        {can(Permission.ServersToggleActive) && (
          <Tooltip title={paused ? 'Resume — allow AI to use this server again' : 'Pause — block all AI requests to this server'}>
            <span>
              <Button size="small" variant={paused ? 'contained' : 'outlined'}
                color={paused ? 'success' : 'warning'}
                startIcon={pauseSaving ? <CircularProgress size={13} color="inherit" /> : paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                onClick={() => handlePause(!paused)} disabled={pauseSaving}>
                {paused ? 'Resume' : 'Pause'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Maintenance mode */}
      <Box mb={2}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>Maintenance message</Typography>
          <SaveIndicator status={maintSave} />
          <FormControlLabel
            control={<Switch size="small" checked={maintEnabled} color="warning"
              onChange={(e) => { setMaintEnabled(e.target.checked); scheduleMaint(e.target.checked, maintMsg) }} />}
            label={<Typography variant="caption">{maintEnabled ? 'On' : 'Off'}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {maintEnabled && (
          <TextField size="small" fullWidth multiline minRows={3} maxRows={6}
            label="Message shown to clients when maintenance is active"
            placeholder="We are performing scheduled maintenance. Back online at 14:00 UTC."
            value={maintMsg}
            onChange={(e) => { setMaintMsg(e.target.value); scheduleMaint(maintEnabled, e.target.value) }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          When enabled, all requests get a 503 with this message. Useful for planned downtime.
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Availability days */}
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <IconClock size={18} />
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>Availability days</Typography>
          <SaveIndicator status={avSave} />
          <FormControlLabel
            control={<Switch size="small" checked={avEnabled} color="primary"
              onChange={(e) => { setAvEnabled(e.target.checked); saveAv(e.target.checked, avTz, avSchedule) }} />}
            label={<Typography variant="caption">{avEnabled ? 'On' : 'Off'}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {avEnabled && (
          <Box>
            {/* Timezone */}
            <FormControl size="small" sx={{ minWidth: 200, mb: 1.5 }}>
              <InputLabel>Timezone</InputLabel>
              <Select value={avTz} label="Timezone"
                onChange={(e) => { setAvTz(e.target.value); saveAv(avEnabled, e.target.value, avSchedule) }}>
                {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Schedule entries */}
            <Box display="flex" flexDirection="column" gap={1} mb={1}>
              {avSchedule.map(entry => (
                <Box key={entry.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Day</InputLabel>
                    <Select value={entry.day} label="Day"
                      onChange={(e) => updateEntry(entry.id, 'day', Number(e.target.value))}>
                      {DAY_LABELS.map((label, i) => <MenuItem key={i} value={i}>{label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>From</InputLabel>
                    <Select value={entry.startHour} label="From"
                      onChange={(e) => updateEntry(entry.id, 'startHour', Number(e.target.value))}>
                      {hours.filter(h => h < entry.endHour).map(h => <MenuItem key={h} value={h}>{fmtHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary">–</Typography>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>To</InputLabel>
                    <Select value={entry.endHour} label="To"
                      onChange={(e) => updateEntry(entry.id, 'endHour', Number(e.target.value))}>
                      {hours.filter(h => h > entry.startHour).map(h => <MenuItem key={h} value={h}>{fmtHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <IconButton size="small" color="error" onClick={() => removeEntry(entry.id)}>
                    <IconX size={18} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button size="small" startIcon={<IconPlus size={18} />} onClick={addEntry}>
              Add entry
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Restrict AI access to specific days and hours. Requests outside the schedule return a 503 error.
        </Typography>
      </Box>
    </Paper>
  )
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

import { ToolOutputTemplateSection } from '../features/server/api-endpoints/ToolOutputTemplateSection'

import { ToolDialog } from '../features/server/api-endpoints/ToolDialog'
import { buildCurl, buildMcpCurl, inferSchema } from '../features/server/api-endpoints/curl-utils'

import { FieldInput, extractHbSchema } from '../features/server/resources/DynamicResourceDialog'

import { ToolCommentsSection } from '../features/server/api-endpoints/ToolCommentsSection'
import { ToolAccordion } from '../features/server/api-endpoints/ToolAccordion'
// ─── ResourcesTab ─────────────────────────────────────────────────────────────

import { DynamicResourceDialog } from '../features/server/resources/DynamicResourceDialog'
import { ResourceTestPanel } from '../features/server/resources/ResourceTestPanel'
import { ResourcesTab } from '../features/server/resources/ResourcesTab'
// ─── PromptsTab ───────────────────────────────────────────────────────────────

import { StepBuilder } from '../features/server/chains/StepBuilder'
import { ChainDialog } from '../features/server/chains/ChainDialog'
import { ChainsTab } from '../features/server/chains/ChainsTab'

// ─── ChainsTab (extracted — see src/features/server/chains/)
import { PromptTestPanel } from '../features/server/prompts/PromptTestPanel'
import { PromptsTab } from '../features/server/prompts/PromptsTab'

// ─── PromptTestPanel + PromptsTab (extracted — see src/features/server/prompts/)
import { StatCard, ProjectLogs } from '../features/server/activity/ProjectLogs'

// ─── StatCard + ProjectLogs (extracted — see src/features/server/activity/)
import { FromEndpointPickerDialog } from '../features/server/api-endpoints/FromEndpointPickerDialog'

// ─── FromEndpointPickerDialog (extracted — see src/features/server/api-endpoints/)
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

  return (
    <Box py={3} px={0}>
      {/* Nav */}
      <Box mb={2}>
        <Button startIcon={<IconArrowLeft size={18} />} size="small" onClick={() => navigate('/')}>Servers</Button>
      </Box>

      {/* Header — always visible */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, borderRadius: '10px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box minWidth={0} flexGrow={1}>
            <InlineEdit value={project.name} onSave={(v) => saveProjectInfo('name', v)}
              readOnly={!can(Permission.ServersEditSettings)} placeholder="Server name" fontSize="1.375rem" fontWeight={700} />
            <Box mt={0.5}>
              <InlineEdit value={project.description ?? ''} onSave={(v) => saveProjectInfo('description', v)}
                readOnly={!can(Permission.ServersEditSettings)} multiline placeholder="Add a short description…" emptyLabel="Add a short description…"
                fontSize="0.875rem" color="text.secondary" />
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start">
            {isPaused
              ? <Chip label="Paused" icon={<IconPlayerPause size={18} />} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
              : <Chip
                  label={project.status === 'active' ? 'Active' : 'Error'}
                  color={project.status === 'active' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
            }
            {project.version && <Chip label={`v${project.version}`} variant="outlined" sx={{ fontWeight: 500 }} />}
            {can(Permission.ServersCreate) && (
              <Tooltip title="Upload a new version of the spec to add or update tools">
                <Button size="small" variant="outlined" startIcon={<IconRefresh size={18} />}
                  onClick={() => { setReimportOpen(true); setReimportSuccess(null) }}>
                  Update from spec
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>

      {reimportSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReimportSuccess(null)}>
          Done — <strong>{reimportSuccess.added}</strong> tool{reimportSuccess.added !== 1 ? 's' : ''} added,{' '}
          <strong>{reimportSuccess.updated}</strong> updated.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<IconWorld size={16} />} iconPosition="start" label="Connect" />
        <Tab icon={<IconRoute size={16} />} iconPosition="start"
          label={`API Endpoints${project.tools.length > 0 ? ` (${project.tools.length})` : ''}`} />
        <Tab icon={<IconTool size={16} />} iconPosition="start"
          label={`Tools${project.tools.length > 0 ? ` (${project.tools.length})` : ''}`} />
        <Tab icon={<IconDatabase size={16} />} iconPosition="start"
          label={`Resources${(project.resources ?? []).length > 0 ? ` (${project.resources!.length})` : ''}`} />
        <Tab icon={<IconBulb size={16} />} iconPosition="start"
          label={`Prompts${(project.prompts ?? []).length > 0 ? ` (${project.prompts!.length})` : ''}`} />
        <Tab icon={<IconArrowsShuffle size={16} />} iconPosition="start"
          label={`Chains${(project.chains ?? []).length > 0 ? ` (${project.chains!.length})` : ''} (WIP)`} disabled />
        <Tab icon={<IconAdjustments size={16} />} iconPosition="start" label="Settings" />
        <Tab icon={<IconChartBar size={16} />} iconPosition="start" label="Activity" />
        <Tab icon={<IconBook size={16} />} iconPosition="start" label="AI View" />
      </Tabs>

      {/* ── Tab 0: Connect ─────────────────────────────────────────────────────── */}
      {tab === 0 && (
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

      {/* ── Tab 1: API Endpoints ──────────────────────────────────────────────── */}
      {tab === 1 && (
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

      {/* ── Tab 2: Tools ──────────────────────────────────────────────────────── */}
      {tab === 2 && (can(Permission.ToolsView) ? (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard label="Total tools" value={project.tools.length} color="#5D87FF" />
            </Grid>
            {Object.entries(methodCounts).map(([method, count]) => (
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
            {availableMethods.length > 1 && (
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
      ))}

      {/* ── Tab 3: Resources ──────────────────────────────────────────────────── */}
      {tab === 3 && (can(Permission.ResourcesView) ? (
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

      {/* ── Tab 4: Prompts ────────────────────────────────────────────────────── */}
      {tab === 4 && (
        <PromptsTab
          projectId={id!}
          initialPrompts={project.prompts ?? []}
          onChange={(prompts) => setProject((prev) => prev ? { ...prev, prompts } : prev)}
          anyApiKey={project.mcpApiKeys?.[0]?.key}
        />
      )}

      {/* ── Tab 5: Chains ─────────────────────────────────────────────────────── */}
      {tab === 5 && (
        <ChainsTab
          projectId={id!}
          initialChains={project.chains ?? []}
          tools={project.tools ?? []}
          onChange={(chains) => setProject((prev) => prev ? { ...prev, chains } : prev)}
        />
      )}

      {/* ── Tab 6: Settings ───────────────────────────────────────────────────── */}
      {tab === 6 && (
        can(Permission.ServersEditSettings) ? <>
          <BaseUrlPanel projectId={id!} initialValue={baseUrl} onChange={setBaseUrl} />
          <AuthConfigPanel
            projectId={id!}
            initialAuth={project.auth}
            onChange={(auth) => setProject((prev) => prev ? { ...prev, auth } : prev)}
          />
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
        </> : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
            <Typography color="text.secondary" variant="h6">Access restricted</Typography>
            <Typography color="text.secondary" variant="body2">You don't have permission to manage server settings.</Typography>
          </Box>
        )
      )}

      {/* ── Tab 7: Activity ───────────────────────────────────────────────────── */}
      {tab === 7 && (
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

      {/* ── Tab 8: AI View ────────────────────────────────────────────────────── */}
      {tab === 8 && (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>What your AI sees</Typography>
            <HelpButton title="What your AI sees">
              <Typography variant="body2">
                This is the exact list of tools and descriptions your AI receives when it connects. If the AI is not using a tool correctly, check its description here — clearer descriptions lead to better results.
              </Typography>
            </HelpButton>
          </Box>
          <McpDocsContent project={project} projectId={id!} />
        </>
      )}

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
