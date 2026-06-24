import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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

interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  outputTemplate?: string
  errorConfig?: { message: string }
  endpointRef: EndpointRef
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
  mcpApiKey?: string
  mcpApiKeys?: McpApiKeyEntry[]
  oauthClientId?: string
  oauthClientSecret?: string
  rateLimit?: { enabled: boolean; requestsPerMinute: number }
  auth?: AuthConfig
  createdAt: string
  updatedAt: string
}

type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2-client' | 'custom'

type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] }

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
        <Tooltip title={multiline ? 'Save (Ctrl+Enter)' : 'Save (Enter)'}>
          <span>
            <IconButton size="small" color="primary" onClick={commit} disabled={saving}>
              {saving ? <CircularProgress size={13} /> : <IconCheck size={18} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel (Esc)">
          <IconButton size="small" onClick={cancel} disabled={saving}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

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

// ─── MCP Endpoint bar ─────────────────────────────────────────────────────────

function McpEndpointBar({ projectId, hasKeys }: { projectId: string; hasKeys: boolean }) {
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const url = `${window.location.origin}/api/mcp/server/${projectId}`
  const { can } = useAuth()

  const handleShareOpen = async () => {
    setShareOpen(true)
    if (shareLink) return
    setShareLoading(true)
    try {
      const { data } = await api.post<{ url: string }>(`/swagger/servers/${projectId}/share-link`)
      setShareLink(data.url)
    } catch { setShareLink('') } finally { setShareLoading(false) }
  }

  const fullShareLink = shareLink ? `${window.location.origin}${shareLink}` : ''

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <IconWorld size={18} style={{ color: '#5D87FF' }} />
        <Typography variant="subtitle1" fontWeight={700} flexGrow={1}>Connection URL</Typography>
        {can(Permission.ServersShare) && <Tooltip title="Share setup instructions with a client">
          <Button size="small" variant="outlined" startIcon={<IconShare size={18} />} onClick={handleShareOpen}>
            Share with client
          </Button>
        </Tooltip>}
        <HelpButton title="MCP Endpoint">
          <Typography variant="body2" gutterBottom>
            The URL that MCP clients (Claude Desktop, Cursor, or any compatible client) use to connect to <em>this specific server's</em> tools.
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Share with client</strong> — generates a step-by-step setup page you can send to your client. The page includes a QR code and copy-ready configuration snippets for Claude Desktop, Cursor, and generic MCP clients.
          </Typography>
          <Typography variant="body2">
            If <strong>MCP Authentication</strong> is enabled, the client must include the header <code>auth: &lt;key&gt;</code> in every request. Without it the server returns HTTP 401.
          </Typography>
        </HelpButton>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <Box sx={{
          flexGrow: 1, fontFamily: 'monospace', fontSize: '0.82rem',
          bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1,
          px: 1.5, py: 1, color: 'text.primary', wordBreak: 'break-all',
        }}>
          {url}
        </Box>
        <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
          <IconButton size="small" color={copied ? 'primary' : 'default'}
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <IconCopy size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {hasKeys
          ? <>Configure this URL in your MCP client and include the header <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.78rem' }}>auth: &lt;key&gt;</Box></>
          : 'Configure this URL in Claude Desktop, Cursor, or any compatible MCP client.'}
      </Typography>

      {/* Share dialog */}
      <Drawer anchor="right" open={shareOpen} onClose={() => setShareOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <IconShare size={18} style={{ color: '#5D87FF' }} />
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Share with client</Typography>
          <IconButton size="small" onClick={() => setShareOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Send this link to anyone who needs to connect their AI client to this server. The page includes step-by-step instructions for Claude Desktop, Cursor, and a QR code for mobile.
          </Typography>
          {shareLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          ) : fullShareLink ? (
            <>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, wordBreak: 'break-all' }}>
                  {fullShareLink}
                </Box>
                <Tooltip title={shareLinkCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" color={shareLinkCopied ? 'primary' : 'default'}
                    onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={2}>
                <QRCodeSVG value={fullShareLink} size={140} />
                <Typography variant="caption" color="text.disabled">Scan to open on a mobile device</Typography>
              </Box>
              <Alert severity="info" icon={<IconQrcode size={18} />}>
                This link is valid for 30 days. It gives read-only setup information — no access to data or credentials.
              </Alert>
            </>
          ) : (
            <Alert severity="error">Could not generate the share link. Please try again.</Alert>
          )}
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setShareOpen(false)}>Close</Button>
          {fullShareLink && (
            <Button variant="contained" startIcon={<IconCopy size={18} />}
              onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
              {shareLinkCopied ? 'Copied!' : 'Copy link'}
            </Button>
          )}
        </Box>
      </Drawer>
    </Paper>
  )
}

// ─── API Key panel ────────────────────────────────────────────────────────────

// ─── Multi-key MCP authentication panel ──────────────────────────────────────

function ApiKeysPanel({ projectId, initialKeys, onChange }: {
  projectId: string
  initialKeys: McpApiKeyEntry[]
  onChange: (keys: McpApiKeyEntry[]) => void
}) {
  const [keys, setKeys] = useState<McpApiKeyEntry[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const { can } = useAuth()
  // After creation, the newly created key id is tracked to highlight it
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  // Revoke confirm dialog
  const [revokeTarget, setRevokeTarget] = useState<McpApiKeyEntry | null>(null)
  const [revoking, setRevoking] = useState(false)

  const syncKeys = (updated: McpApiKeyEntry[]) => { setKeys(updated); onChange(updated) }

  const handleAdd = async () => {
    if (!newKeyName.trim()) { setAddError('Name is required.'); return }
    setAdding(true)
    setAddError('')
    try {
      const { data } = await api.post<McpApiKeyEntry>(`/swagger/servers/${projectId}/api-keys`, { name: newKeyName.trim() })
      const updated = [...keys, data]
      syncKeys(updated)
      setNewlyCreatedId(data.id)
      setVisibleIds((s) => new Set([...s, data.id]))
      setAddOpen(false)
      setNewKeyName('')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error creating key.'
        : 'Error creating key.'
      setAddError(msg)
    } finally { setAdding(false) }
  }

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/api-keys/${revokeTarget.id}`)
      const updated = keys.filter((k) => k.id !== revokeTarget.id)
      syncKeys(updated)
      if (newlyCreatedId === revokeTarget.id) setNewlyCreatedId(null)
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  const handleCopy = (entry: McpApiKeyEntry) => {
    navigator.clipboard.writeText(entry.key)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleVisible = (id: string) => {
    setVisibleIds((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const maskKey = (key: string) => `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-6)}`

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={keys.length > 0 ? 2 : 0}>
        {keys.length > 0
          ? <IconLock size={18} style={{ color: '#13DEB9' }} />
          : <IconLockOpen size={18} style={{ opacity: 0.38 }} />}
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>Access Keys</Typography>
          <HelpButton title="Access Keys">
            <Typography variant="body2" gutterBottom>
              Named keys that control who can connect to this server's AI endpoint.
              Every client must include <code>auth: &lt;key&gt;</code> in their configuration — requests without a valid key are rejected.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Create <strong>one key per client</strong> (e.g. "Claude Desktop", "Cursor") so you can revoke access for a single client without affecting others.
            </Typography>
            <Typography variant="body2">
              Without any key, the endpoint is <strong>publicly accessible</strong> to anyone who knows the URL.
            </Typography>
          </HelpButton>
        </Box>
        {can(Permission.ApiKeysCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={18} />}
            onClick={() => { setAddOpen(true); setNewKeyName(''); setAddError('') }}>
            Add key
          </Button>
        )}
      </Box>

      {keys.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          No keys — any MCP client can connect without authentication.
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {keys.map((entry) => {
            const isNew = entry.id === newlyCreatedId
            const isVisible = visibleIds.has(entry.id)
            return (
              <Box key={entry.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                border: '1px solid', borderColor: isNew ? 'success.light' : 'divider',
                borderRadius: 1, px: 1.5, py: 1,
                bgcolor: isNew ? 'rgba(73,204,144,0.08)' : 'transparent',
                transition: 'background-color 0.3s',
              }}>
                <Box flexGrow={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                    <Typography fontWeight={600} fontSize="0.875rem">{entry.name}</Typography>
                    {isNew && <Chip label="new — copy now" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />}
                  </Box>
                  <Box sx={{
                    fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {isVisible ? entry.key : maskKey(entry.key)}
                  </Box>
                  <Typography variant="caption" color="text.disabled">
                    Created {new Date(entry.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Tooltip title={isVisible ? 'Hide key' : 'Show key'}>
                  <IconButton size="small" onClick={() => toggleVisible(entry.id)}>
                    {isVisible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copiedId === entry.id ? 'Copied!' : 'Copy key'}>
                  <IconButton size="small" color={copiedId === entry.id ? 'primary' : 'default'} onClick={() => handleCopy(entry)}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
                {can(Permission.ApiKeysDelete) && (
                  <Tooltip title="Revoke key">
                    <IconButton size="small" color="error" onClick={() => setRevokeTarget(entry)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          })}
          <Typography variant="caption" color="text.secondary" mt={0.5}>
            Use in the header: <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.75rem' }}>auth: &lt;key&gt;</Box>
          </Typography>
        </Box>
      )}

      {/* Add key dialog */}
      <Drawer anchor="right" open={addOpen} onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Add API key</Typography>
          <IconButton size="small" onClick={() => setAddOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <TextField size="small" fullWidth autoFocus label="Key name"
            placeholder="e.g. Claude Desktop, Production client"
            value={newKeyName}
            onChange={(e) => { setNewKeyName(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
            helperText="A label to identify which client uses this key"
          />
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={adding}
            startIcon={adding ? <CircularProgress size={14} color="inherit" /> : <IconLock size={18} />}>
            {adding ? 'Creating…' : 'Create key'}
          </Button>
        </Box>
      </Drawer>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={revokeTarget !== null}
        title={`Revoke "${revokeTarget?.name}"?`}
        message="Any client using this key will immediately lose access."
        confirmLabel="Revoke"
        confirmColor="error"
        loading={revoking}
        onConfirm={handleRevokeConfirm}
        onClose={() => setRevokeTarget(null)}
      />
    </Paper>
  )
}

// ─── OAuth Client Panel ───────────────────────────────────────────────────────

function OAuthClientPanel({ projectId, initialClientId, initialClientSecret, serverBase, onChange }: {
  projectId: string
  initialClientId?: string
  initialClientSecret?: string
  serverBase: string
  onChange: (clientId: string | null, clientSecret: string | null) => void
}) {
  const { can } = useAuth()
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [clientSecret, setClientSecret] = useState(initialClientSecret ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState<'id' | 'secret' | 'auth' | 'token' | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const hasCredentials = !!initialClientId

  const authUrl = `${serverBase}/oauth/project/${projectId}/authorize`
  const tokenUrl = `${serverBase}/oauth/project/${projectId}/token`

  const copy = (text: string, key: 'id' | 'secret' | 'auth' | 'token') => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateRandom = (len = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  const handleGenerate = () => {
    setClientId(generateRandom(16))
    setClientSecret(generateRandom(32))
  }

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    setSaving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/oauth-client`, {
        oauthClientId: clientId.trim(),
        oauthClientSecret: clientSecret.trim(),
      })
      onChange(clientId.trim(), clientSecret.trim())
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/oauth-client`, {
        oauthClientId: null,
        oauthClientSecret: null,
      })
      setClientId('')
      setClientSecret('')
      onChange(null, null)
    } finally { setRemoving(false); setConfirmRemove(false) }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconKey size={18} style={{ color: hasCredentials ? '#5D87FF' : undefined, opacity: hasCredentials ? 1 : 0.38 }} />
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>OAuth Client</Typography>
          <HelpButton title="ChatGPT OAuth Client">
            <Typography variant="body2" gutterBottom>
              Allows ChatGPT (and other OAuth 2.0 clients) to connect to this server's MCP endpoint using your account credentials.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Generate a <strong>Client ID</strong> and <strong>Client Secret</strong>, then paste the Auth and Token URLs into ChatGPT's connector settings.
            </Typography>
            <Typography variant="body2">
              When a user connects via ChatGPT they will be prompted to log in with their MCP Server account.
            </Typography>
          </HelpButton>
        </Box>
        {hasCredentials && can(Permission.ServersEditSettings) && (
          <Button size="small" color="error" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        )}
      </Box>

      {hasCredentials ? (
        <>
          {/* URLs to paste into ChatGPT */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            Paste these URLs into ChatGPT
          </Typography>
          {([
            { label: 'Auth URL', value: authUrl, key: 'auth' as const },
            { label: 'Token URL', value: tokenUrl, key: 'token' as const },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {value}
                </Box>
              </Box>
              <Tooltip title={copied === key ? 'Copied!' : `Copy ${label}`}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Divider sx={{ my: 1.5 }} />

          {/* Client credentials */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
            Client credentials
          </Typography>
          {([
            { label: 'Client ID', value: initialClientId!, key: 'id' as const, mono: true },
          ]).map(({ label, value, key }) => (
            <Box key={key} display="flex" alignItems="center" gap={1} mb={1}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{value}</Box>
              </Box>
              <Tooltip title={copied === key ? 'Copied!' : 'Copy'}>
                <IconButton size="small" color={copied === key ? 'primary' : 'default'} onClick={() => copy(value, key)}>
                  <IconCopy size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Box display="flex" alignItems="center" gap={1} mb={1}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}>
            <Box flexGrow={1} minWidth={0}>
              <Typography variant="caption" color="text.secondary">Client Secret</Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {secretVisible ? initialClientSecret : '••••••••••••••••••••••••'}
              </Box>
            </Box>
            <Tooltip title={secretVisible ? 'Hide' : 'Show'}>
              <IconButton size="small" onClick={() => setSecretVisible((v) => !v)}>
                {secretVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={copied === 'secret' ? 'Copied!' : 'Copy'}>
              <IconButton size="small" color={copied === 'secret' ? 'primary' : 'default'} onClick={() => copy(initialClientSecret!, 'secret')}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.disabled" mb={2}>
            No OAuth client configured — ChatGPT cannot connect via OAuth.
          </Typography>
          {can(Permission.ServersEditSettings) && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" gap={1}>
                <TextField size="small" fullWidth label="Client ID" value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                <TextField size="small" fullWidth label="Client Secret" value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
              </Box>
              <Box display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={handleGenerate}>
                  Auto-generate
                </Button>
                <Button size="small" variant="contained" onClick={handleSave} disabled={saving || !clientId.trim() || !clientSecret.trim()}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconKey size={16} />}>
                  {saving ? 'Saving…' : 'Save credentials'}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove OAuth client?"
        message="ChatGPT and any other OAuth clients will immediately lose access."
        confirmLabel="Remove"
        confirmColor="error"
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setConfirmRemove(false)}
      />
    </Paper>
  )
}

// ─── Endpoint accordion (with inline test) ────────────────────────────────────

function EndpointAccordion({ endpoint, projectId, anyApiKey, canTest, onEdit, onToolChanged }: {
  endpoint: { tool: GeneratedTool } & EndpointRef
  projectId: string
  anyApiKey?: string
  canTest: boolean
  onEdit?: () => void
  onToolChanged?: (oldName: string, newTool: GeneratedTool) => void
}) {
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
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Unknown error')
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
            <Tooltip title="Edit endpoint">
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
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Parameters</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
              <Table size="small" sx={{
                minWidth: 460,
                '& th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem', verticalAlign: 'middle' },
              }}>
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode && paramEntries.length ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>Try it out</Typography>
          {canTest && (
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
                  {paramEntries.map(([name, schema]: [string, any]) => (
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
                      {savingSchema ? 'Saving…' : 'Use as output schema'}
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
            <Typography variant="subtitle2" fontWeight={700}>Output Schema</Typography>
            {tool.outputSchema
              ? <Chip label="configured" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />
              : <Chip label="none" size="small" sx={{ fontSize: '0.65rem', height: 18, opacity: 0.5 }} />}
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
                Clear
              </Button>
            )}
            {tool.outputSchema && (
              <Button size="small" onClick={() => setSchemaOpen((v) => !v)}>
                {schemaOpen ? 'Hide' : 'View'}
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
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editEndpoint, setEditEndpoint] = useState<GeneratedTool | null>(null)

  const endpoints = tools.map((t) => ({ tool: t, ...t.endpointRef }))

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
          <StatCard label="Total endpoints" value={endpoints.length} color="#5D87FF" />
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
          size="small" placeholder="Search by path, name or description…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
        {methods.length > 1 && (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            <Chip label="All" size="small" clickable onClick={() => setMethodFilter(null)}
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
            {visible.length} of {endpoints.length}
          </Typography>
        )}
        <Box flexGrow={1} />
        {can(Permission.EndpointsCreate) && (
          <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
            onClick={() => setCreateOpen(true)}>
            Add endpoint
          </Button>
        )}
      </Box>

      {/* Endpoint list */}
      {endpoints.length === 0 ? (
        <Alert severity="info">No endpoints — upload an OpenAPI spec or click "Add endpoint" to create one manually.</Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">No endpoints match your search.</Alert>
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

// ─── Re-import spec dialog ────────────────────────────────────────────────────

function ReimportSpecDialog({ projectId, open, onClose, onSuccess }: {
  projectId: string
  open: boolean
  onClose: () => void
  onSuccess: (result: { added: number; updated: number; baseUrl: string }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setFile(null); setBaseUrl(''); setError('') }

  const handleClose = () => { reset(); onClose() }

  const acceptFile = (f: File) => {
    const n = f.name.toLowerCase()
    if (!n.endsWith('.yaml') && !n.endsWith('.yml') && !n.endsWith('.json')) {
      setError('Unsupported format — use .yaml, .yml or .json')
      return
    }
    setFile(f)
    setError('')
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
      const { data } = await api.post<{ added: number; updated: number; baseUrl: string }>(
        `/swagger/servers/${projectId}/reimport`, form,
        { params, headers: { 'Content-Type': 'multipart/form-data' } },
      )
      reset()
      onSuccess(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error importing spec.'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally { setLoading(false) }
  }

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <IconRefresh size={18} />
        <Typography variant="h6" fontWeight={700} flexGrow={1}>Re-import API spec</Typography>
        <IconButton size="small" onClick={handleClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Upload a new version of the spec. Tools with the same name will be updated (schema + endpoint);
          new tools will be added. Existing tools not in the new spec are kept — delete them manually if needed.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper variant="outlined"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }}
          onClick={() => !file && fileInputRef.current?.click()}
          sx={{
            p: 3, textAlign: 'center', cursor: file ? 'default' : 'pointer',
            border: '2px dashed',
            borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
            bgcolor: dragging ? 'primary.light' : file ? 'rgba(73,204,144,0.08)' : 'background.paper',
            transition: 'all 0.15s', mb: 2,
            '&:hover': file ? {} : { bgcolor: 'action.hover', borderColor: 'primary.light' },
          }}
        >
          <input ref={fileInputRef} type="file" accept=".yaml,.yml,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = '' }} />
          {file ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <IconFile size={36} style={{ color: '#13DEB9' }} />
              <Typography fontWeight={700} color="success.main">{file.name}</Typography>
              <Button size="small" startIcon={<IconX size={18} />}
                onClick={(e) => { e.stopPropagation(); setFile(null) }}>
                Remove
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <IconCloudUpload size={36} style={{ opacity: 0.5 }} />
              <Typography variant="body2" fontWeight={500}>Drag spec here or click to browse</Typography>
              <Typography variant="caption" color="text.disabled">.yaml · .yml · .json</Typography>
            </Box>
          )}
        </Paper>

        <TextField size="small" fullWidth label="Base URL override" placeholder="https://api.example.com"
          value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
          helperText="Leave blank to use the URL declared in the spec" />
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleImport} disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={18} />}>
          {loading ? 'Importing…' : 'Import'}
        </Button>
      </Box>
    </Drawer>
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

// ─── Auto-save indicator (compartilhado) ─────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status, error }: { status: SaveStatus; error?: string }) {
  if (status === 'idle') return null
  if (status === 'saving') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <CircularProgress size={10} />
      <Typography variant="caption" color="text.secondary">Saving…</Typography>
    </Box>
  )
  if (status === 'saved') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <IconCheck size={14} />
      <Typography variant="caption" color="success.main">Saved</Typography>
    </Box>
  )
  return <Typography variant="caption" color="error.main">{error || 'Failed to save.'}</Typography>
}


// ─── Rate limit panel ─────────────────────────────────────────────────────────

interface RateLimitPanelProps {
  projectId: string
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}

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

interface ScheduleEntry { id: string; day: number; startHour: number; endHour: number }

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
                <TextField size="small" fullWidth multiline minRows={3} maxRows={8} label="Description"
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
              <TextField size="small" fullWidth multiline minRows={3} maxRows={8} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
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
                <TextField size="small" fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
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

// ─── Curl snippet ─────────────────────────────────────────────────────────────

function buildCurl(tool: GeneratedTool): string {
  const { method, path, baseUrl, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  let url = `${baseUrl}${path}`
  ;(parameterMap ?? []).filter((p) => p.source === 'path').forEach((p) => {
    url = url.replace(`{${p.originalName}}`, `<${p.toolParamName}>`)
  })
  const queryParams = (parameterMap ?? []).filter((p) => p.source === 'query')
  if (queryParams.length) url += '?' + queryParams.map((p) => `${p.originalName}=<${p.toolParamName}>`).join('&')
  const lines: string[] = [`curl -X ${method} "${url}"`]
  if (method !== 'GET') { lines[0] += ' \\'; lines.push(`  -H 'Content-Type: application/json'`) }
  ;(parameterMap ?? []).filter((p) => p.source === 'header').forEach((p) => {
    lines[lines.length - 1] += ' \\'; lines.push(`  -H '${p.originalName}: <${p.toolParamName}>'`)
  })
  const bodyParams = (parameterMap ?? []).filter((p) => p.source === 'body')
  if (bodyParams.length) {
    const bodyObj: Record<string, string> = {}
    bodyParams.forEach((p) => { bodyObj[p.toolParamName] = `<${properties[p.toolParamName]?.type ?? 'string'}>` })
    lines[lines.length - 1] += ' \\'; lines.push(`  -d '${JSON.stringify(bodyObj)}'`)
  }
  return lines.join('\n')
}

function buildMcpCurl(tool: GeneratedTool, projectId: string, hasKeys: boolean): string {
  const url = `${window.location.origin}/api/mcp/server/${projectId}`
  const properties = tool.inputSchema.properties ?? {}
  const args = Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [k, `<${v.type ?? 'string'}>`])
  )
  const body = JSON.stringify(
    { jsonrpc: '2.0', method: 'tools/call', id: 1, params: { name: tool.name, arguments: args } },
    null, 2
  )
  const lines = [
    `curl -X POST "${url}" \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream'`,
  ]
  if (hasKeys) { lines[lines.length - 1] += ' \\'; lines.push(`  -H 'auth: <your-api-key>'`) }
  lines[lines.length - 1] += ` \\`
  lines.push(`  -d '${body}'`)
  return lines.join('\n')
}

// ─── Schema inference ─────────────────────────────────────────────────────────

function inferSchema(value: unknown): JsonSchema {
  if (value === null || value === undefined) return { type: 'string' }
  if (Array.isArray(value)) return { type: 'array', items: value.length > 0 ? inferSchema(value[0]) : {} }
  if (typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      properties[k] = inferSchema(v)
    }
    return { type: 'object', properties }
  }
  if (typeof value === 'boolean') return { type: 'boolean' }
  if (typeof value === 'number') return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
  return { type: 'string' }
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

function FieldInput({ name, schema, value, required, onChange }: {
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

// ─── Tool comments ────────────────────────────────────────────────────────────

function ToolCommentsSection({ projectId, toolName, initialComments }: {
  projectId: string
  toolName: string
  initialComments: ToolComment[]
}) {
  const { can } = useAuth()
  const [comments, setComments] = useState<ToolComment[]>(initialComments)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post<ToolComment>(
        `/swagger/servers/${projectId}/tools/${encodeURIComponent(toolName)}/comments`,
        { text: text.trim(), author: 'me' },
      )
      setComments((prev) => [...prev, data])
      setText('')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/swagger/servers/${projectId}/tools/${encodeURIComponent(toolName)}/comments/${id}`)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <IconMessage size={15} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Notes ({comments.length})
        </Typography>
        <IconChevronDown size={14} style={{ color: 'var(--mui-palette-text-disabled, #bdbdbd)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </Box>

      {open && (
        <Box mt={1.5} display="flex" flexDirection="column" gap={1}>
          {comments.length === 0 && (
            <Typography variant="caption" color="text.disabled">No notes yet.</Typography>
          )}
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Box flexGrow={1}>
                <Typography fontSize="0.82rem">{c.text}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {c.author} · {new Date(c.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              {can(Permission.ToolsEdit) && (
                <Tooltip title="Delete note">
                  <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                    <IconTrash size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
          {can(Permission.ToolsEdit) && (
            <Box display="flex" gap={1} mt={0.5}>
              <TextField size="small" fullWidth placeholder="Add a note…" value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }} />
              <Button size="small" variant="contained" onClick={handleAdd} disabled={!text.trim() || saving}
                startIcon={saving ? <CircularProgress size={12} color="inherit" /> : undefined}>
                Add
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
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

  const { method, path, parameterMap } = tool.endpointRef
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
          <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
            <InlineEdit value={tool.name} onSave={(v) => saveToolMeta('name', v)}
              readOnly={!can(Permission.ToolsEdit)} placeholder="Tool name" fontSize="0.875rem" fontWeight={700} />
          </Box>

          {/* Disabled chip */}
          {isDisabled && (
            <Chip label="Disabled" size="small"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#9e9e9e', color: '#fff', flexShrink: 0 }} />
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
            size="small" fullWidth multiline minRows={2} label="Description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this chain does…"
          />

          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>Steps</Typography>
              <Button size="small" startIcon={<IconPlus size={14} />} onClick={addStep}
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

  const openCreate = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = (c: ToolChain) => { setEditTarget(c); setDialogOpen(true) }

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
      alert(err?.response?.data?.message ?? 'Failed to save chain.')
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

      <ChainDialog
        open={dialogOpen}
        editTarget={editTarget}
        tools={tools}
        onClose={() => setDialogOpen(false)}
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

interface ExecLog {
  _id: string
  toolName: string
  source: 'mcp' | 'direct'
  statusCode: number
  responseTimeMs: number
  isError: boolean
  errorMessage?: string
  createdAt: string
}

function ProjectLogs({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<ExecLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const LIMIT = 50

  const load = (s = 0) => {
    setLoading(true)
    api.get<{ logs: ExecLog[]; total: number }>(`/servers/${projectId}/logs?limit=${LIMIT}&skip=${s}`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total); setSkip(s) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>Call history — {total} records</Typography>
        <Button size="small" onClick={() => load(0)}>Refresh</Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Date/Time', 'Tool', 'Source', 'Status', 'Time (ms)', 'Error'].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" fontSize="0.85rem" py={2} textAlign="center">
                    No calls recorded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log._id} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: log.isError ? 'error.light' : undefined }}>
                <TableCell>
                  <Typography fontSize="0.78rem" color="text.secondary" whiteSpace="nowrap">
                    {new Date(log.createdAt).toLocaleString('en-US')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.875rem" fontWeight={500} fontFamily="monospace">{log.toolName}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={log.source === 'mcp' ? 'MCP' : 'Direct'} size="small"
                    color={log.source === 'mcp' ? 'primary' : 'default'} sx={{ fontSize: '0.7rem', height: 20 }} />
                </TableCell>
                <TableCell>
                  <Chip label={log.statusCode} size="small"
                    color={log.statusCode < 400 ? 'success' : 'error'} sx={{ fontSize: '0.7rem', height: 20 }} />
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.82rem" color={log.responseTimeMs > 3000 ? 'warning.main' : 'text.secondary'}>
                    {log.responseTimeMs}ms
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.errorMessage ? (
                    <Tooltip title={log.errorMessage}>
                      <Typography fontSize="0.78rem" color="error.main" noWrap sx={{ maxWidth: 200 }}>
                        {log.errorMessage}
                      </Typography>
                    </Tooltip>
                  ) : <Typography color="text.disabled" fontSize="0.78rem">—</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button size="small" disabled={skip === 0} onClick={() => load(Math.max(0, skip - LIMIT))}>← Previous</Button>
        <Typography variant="caption" color="text.secondary">{skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</Typography>
        <Button size="small" disabled={skip + LIMIT >= total} onClick={() => load(skip + LIMIT)}>Next →</Button>
      </Box>
    </Box>
  )
}

// ─── From-endpoint picker (Tools tab) ────────────────────────────────────────

function FromEndpointPickerDialog({ open, tools, onPick, onClose, onBlank, title = 'Create tool from endpoint', description = "Select an endpoint to pre-fill the tool form with its HTTP details. You'll only need to fill in the tool name and description." }: {
  open: boolean
  tools: GeneratedTool[]
  onPick: (tool: GeneratedTool) => void
  onClose: () => void
  onBlank?: () => void
  title?: string
  description?: string
}) {
  const [search, setSearch] = useState('')
  const filtered = tools.filter((t) => {
    const q = search.toLowerCase()
    return !q || t.endpointRef?.path?.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  })

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 460 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{title}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ px: 3, pt: 2, pb: 1, flexShrink: 0 }}>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          {description}
        </Typography>
        <TextField
          size="small" fullWidth placeholder="Search by path or name…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <Box display="flex" flexDirection="column" gap={0.75} pt={1}>
          {tools.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.disabled">No endpoints defined yet.</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.disabled">No endpoints match your search.</Typography>
            </Box>
          ) : (
            filtered.map((t) => (
              <Paper key={t.name} variant="outlined" sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                transition: 'border-color 0.15s',
              }} onClick={() => onPick(t)}>
                <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                  <Box sx={{
                    minWidth: 48, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                    fontSize: '0.68rem', color: METHOD_COLOR[t.endpointRef?.method ?? ''] ?? '#888',
                    bgcolor: 'action.selected', borderRadius: '4px', px: 0.75, py: 0.25,
                  }}>
                    {t.endpointRef?.method ?? '?'}
                  </Box>
                  <Typography fontFamily="monospace" fontSize="0.82rem" noWrap flexGrow={1}>
                    {t.endpointRef?.path ?? '/'}
                  </Typography>
                </Box>
                {t.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, pl: '56px' }} noWrap>
                    {t.description}
                  </Typography>
                )}
              </Paper>
            ))
          )}
          {onBlank && (
            <Paper variant="outlined" sx={{
              px: 2, py: 1.5, cursor: 'pointer',
              borderStyle: 'dashed',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              transition: 'border-color 0.15s',
            }} onClick={onBlank}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{
                  minWidth: 48, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.68rem', color: 'text.disabled',
                  bgcolor: 'action.selected', borderRadius: '4px', px: 0.75, py: 0.25,
                }}>
                  —
                </Box>
                <Box>
                  <Typography fontSize="0.82rem" fontWeight={600}>Blank resource</Typography>
                  <Typography variant="caption" color="text.secondary">Static content — write the HTML manually</Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Drawer>
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
