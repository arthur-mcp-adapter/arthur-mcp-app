import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type {
  ParameterMapping, EndpointRef, JsonSchema, ToolComment, GeneratedTool,
  McpApiKeyEntry, McpResource, McpPrompt, ChainInputSource, ChainInputMapping,
  ChainStep, ToolChain, GlobalPrompt, Project,
  InlineEditProps, ParamEntry, HeaderEntry, ToolDialogProps,
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
  IconPlus,
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
import { useServerNav } from '../context/ServerNavContext'
import api from '../api'
import HelpButton from '../components/HelpButton'
import ConfirmDialog from '../components/ConfirmDialog'
import { McpDocsContent } from './McpDocs'
import { InlineEdit } from '../features/server/settings/InlineEdit'
import { BaseUrlPanel } from '../features/server/settings/BaseUrlPanel'
import { AuthConfigPanel } from '../features/server/settings/AuthConfigPanel'
import { RateLimitPanel } from '../features/server/settings/RateLimitPanel'
import { ProjectControlsPanel } from '../features/server/settings/ProjectControlsPanel'
import { AlertConfigPanel } from '../features/server/settings/AlertConfigPanel'
import { TenantConfigPanel } from '../features/server/settings/TenantConfigPanel'
import { McpEndpointBar } from '../features/server/connect/McpEndpointBar'
import { ApiKeysPanel } from '../features/server/connect/ApiKeysPanel'
import { OAuthClientPanel } from '../features/server/connect/OAuthClientPanel'
import { ApiEndpointsTab } from '../features/server/api-endpoints/ApiEndpointsTab'
import { ToolAccordion } from '../features/server/api-endpoints/ToolAccordion'
import { FromEndpointPickerDialog } from '../features/server/api-endpoints/FromEndpointPickerDialog'
import { ReimportSpecDialog } from '../features/server/api-endpoints/ReimportSpecDialog'
import { ToolDialog } from '../features/server/api-endpoints/ToolDialog'
import { ChainsTab } from '../features/server/chains/ChainsTab'
import { PromptsTab } from '../features/server/prompts/PromptsTab'
import { ResourcesTab } from '../features/server/resources/ResourcesTab'
import { ProjectLogs, StatCard } from '../features/server/activity/ProjectLogs'

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { setServerDetail } = useServerNav()
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

  useEffect(() => {
    if (!project) return

    setServerDetail({
      name: project.name,
      sourceEmoji: '🖧',
      sourceColor: '#5D87FF',
      backLabel: 'Servers',
      backPath: '/',
      navItems: [
        { label: 'Connect', icon: <IconWorld size={17} />, idx: 0 },
        { label: 'API Endpoints', icon: <IconRoute size={17} />, idx: 1 },
        { label: 'Tools', icon: <IconTool size={17} />, idx: 2, badge: project.tools.length },
        { label: 'Resources', icon: <IconDatabase size={17} />, idx: 3, badge: (project.resources ?? []).length },
        { label: 'Prompts', icon: <IconBulb size={17} />, idx: 4, badge: (project.prompts ?? []).length },
        { label: 'Chains', icon: <IconArrowsShuffle size={17} />, idx: 5, badge: (project.chains ?? []).length, disabled: true },
        { label: 'Settings', icon: <IconAdjustments size={17} />, idx: 6 },
        { label: 'Activity', icon: <IconChartBar size={17} />, idx: 7 },
        { label: 'AI View', icon: <IconBook size={17} />, idx: 8 },
      ],
      tab,
      onTabChange: (next) => setTab(next as number),
    })
  }, [project, tab, setServerDetail])

  useEffect(() => () => setServerDetail(null), [setServerDetail])

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
