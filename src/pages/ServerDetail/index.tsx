import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type {
  ParameterMapping, EndpointRef, JsonSchema, ToolComment, GeneratedTool,
  McpApiKeyEntry, McpResource, McpPrompt, ChainInputSource, ChainInputMapping,
  ChainStep, ToolChain, GlobalPrompt, Project,
  InlineEditProps, ParamEntry, HeaderEntry, ToolDialogProps,
  HbScalar, HbArray, ExecLog,
} from '../../features/server/types'
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
  IconTestPipe,
  IconShieldCheck,
  IconChevronUp,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconExternalLink,
  IconLink,
} from '@tabler/icons-react'
import { QRCodeSVG } from 'qrcode.react'
import MonacoEditor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { useColorMode } from '../../theme/ColorModeContext'
import { useAuth, Permission } from '../../context/AuthContext'
import { useDetailPageNav } from '../../hooks/useDetailPageNav'
import { getProjectIcon, getSourceType } from '../../utils/sourceType'
import api from '../../api'
import { backendUrl } from '../../config/urls'
import { ConfirmDialog, HelpButton } from '../../components'
import { McpDocsContent } from '../McpDocs'
import {
  AlertConfigPanel,
  ApiEndpointsTab,
  ApiKeysPanel,
  BaseUrlPanel,
  ChainsTab,
  HarnessTab,
  GuardRailsTab,
  FromEndpointPickerDialog,
  InlineEdit,
  McpEndpointBar,
  OAuthClientPanel,
  ProjectControlsPanel,
  ProjectLogs,
  PromptsTab,
  ReimportSpecDialog,
  ResourcesTab,
  ResponseLimitPanel,
  StatCard,
  TenantConfigPanel,
  ToolAccordion,
  ToolDialog,
} from '../../features/server'

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
  const { t } = useTranslation('serverDetail')
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
      .catch(() => setError(t('error.serverNotFound')))
      .finally(() => setLoading(false))
  }, [id])

  useDetailPageNav(() => {
    if (!project) return null
    const source = getProjectIcon(project)
    return {
      name: project.name,
      sourceEmoji: source.emoji,
      sourceColor: source.color,
      backLabel: t('nav.backToServers'),
      backPath: '/',
      navItems: [
        { label: t('tab.connect'), icon: <IconWorld size={17} />, idx: 0 },
        { label: t('tab.apiEndpoints'), icon: <IconRoute size={17} />, idx: 1 },
        { label: t('tab.tools'), icon: <IconTool size={17} />, idx: 2, badge: project.tools.length },
        { label: t('tab.resources'), icon: <IconDatabase size={17} />, idx: 3, badge: (project.resources ?? []).length },
        { label: t('tab.prompts'), icon: <IconBulb size={17} />, idx: 4, badge: (project.prompts ?? []).length },
        { label: `${t('tab.chains')} (WIP)`, icon: <IconArrowsShuffle size={17} />, idx: 5, badge: (project.chains ?? []).length, disabled: true },
        { label: t('tab.settings'), icon: <IconAdjustments size={17} />, idx: 6 },
        { label: t('tab.activity'), icon: <IconChartBar size={17} />, idx: 7 },
        { label: t('tab.aiView'), icon: <IconBook size={17} />, idx: 8 },
        { label: t('tab.harness'), icon: <IconTestPipe size={17} />, idx: 9 },
        { label: t('tab.guardRails'), icon: <IconShieldCheck size={17} />, idx: 10 },
      ],
      tab,
      onTabChange: (next: number) => setTab(next),
    }
  }, [project, tab, t])

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
    return <Box p={3}><Alert severity="error">{error || t('error.loadServerError')}</Alert></Box>
  }

  const methodCounts = (project.tools ?? []).reduce<Record<string, number>>((acc, t) => {
    const m = t.endpointRef?.method ?? 'UNKNOWN'
    acc[m] = (acc[m] ?? 0) + 1
    return acc
  }, {})

  const source = getProjectIcon(project)

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
            <Box display="flex" alignItems="center" gap={1.25}>
              <Tooltip title={source.label}>
                <Box sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  flexShrink: 0,
                  bgcolor: `${source.color}18`,
                  border: `1.5px solid ${source.color}35`,
                }}>
                  {source.emoji}
                </Box>
              </Tooltip>
              <Box minWidth={0} flexGrow={1}>
                <InlineEdit value={project.name} onSave={(v) => saveProjectInfo('name', v)}
                  readOnly={!can(Permission.ServersEditSettings)} placeholder={t('placeholder.serverName')} fontSize="1.375rem" fontWeight={700} />
              </Box>
            </Box>
            <Box mt={0.5}>
              <InlineEdit value={project.description ?? ''} onSave={(v) => saveProjectInfo('description', v)}
                readOnly={!can(Permission.ServersEditSettings)} multiline placeholder={t('placeholder.addDescription')} emptyLabel={t('placeholder.addDescription')}
                fontSize="0.875rem" color="text.secondary" />
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start">
            {isPaused
              ? <Chip label={t('status.paused')} icon={<IconPlayerPause size={18} />} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
              : <Chip
                  label={project.status === 'active' ? t('status.active') : t('status.error')}
                  color={project.status === 'active' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
            }
            {project.version && <Chip label={`v${project.version}`} variant="outlined" sx={{ fontWeight: 500 }} />}
            {can(Permission.ServersCreate) && getSourceType(project) === 'rest' && (
              <Tooltip title={t('tooltip.updateFromSpec')}>
                <Button size="small" variant="outlined" startIcon={<IconRefresh size={18} />}
                  onClick={() => { setReimportOpen(true); setReimportSuccess(null) }}>
                  {t('action.reimportSpec')}
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>

      {reimportSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReimportSuccess(null)}>
          {t('reimport.success', { count: reimportSuccess.added, updated: reimportSuccess.updated })}
        </Alert>
      )}

      {/* ── Tab 0: Connect ─────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          <McpEndpointBar
            projectId={id!}
            hasKeys={(project.mcpApiKeys ?? []).length > 0}
            shareSlug={project.shareSlug}
            onShareSlugChange={(shareSlug) => setProject((prev) => prev ? { ...prev, shareSlug } : prev)}
          />
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
            serverBase={backendUrl('')}
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
              <StatCard label={t('label.totalTools')} value={project.tools.length} color="#5D87FF" />
            </Grid>
            {Object.entries(methodCounts).map(([method, count]) => (
              <Grid item xs={6} sm={3} key={method}>
                <StatCard label={method} value={count} color={METHOD_COLOR[method]} />
              </Grid>
            ))}
          </Grid>

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={700}>{t('heading.whatAiCanDo')}</Typography>
              <HelpButton title={t('tab.tools')}>
                <Typography variant="body2" gutterBottom>{t('help.tools.intro')}</Typography>
                <Typography variant="body2" gutterBottom><strong>{t('help.tools.naming')}</strong></Typography>
                <Typography variant="body2" gutterBottom>{t('help.tools.betterDesc')}</Typography>
                <Typography variant="body2" gutterBottom>{t('help.tools.parameters')}</Typography>
                <Typography variant="body2" gutterBottom>{t('help.tools.disable')}</Typography>
                <Typography variant="body2">{t('help.tools.troubleshoot')}</Typography>
              </HelpButton>
            </Box>
            {can(Permission.ToolsCreate) && (
              <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setPickerOpen(true)} size="small">
                {t('action.newTool')}
              </Button>
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <TextField
              size="small" placeholder={t('placeholder.searchNameOrDescription')} value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)} sx={{ width: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
            />
            {availableMethods.length > 1 && (
              <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                <Chip label={t('label.filterAll')} size="small" clickable onClick={() => setToolMethodFilter(null)}
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
                {t('label.visible', { visible: visibleTools.length, total: project.tools.length })}
              </Typography>
            )}
          </Box>

          {project.tools.length === 0
            ? <Alert severity="info">{t('empty.noToolsYet')}</Alert>
            : visibleTools.length === 0
              ? <Alert severity="info">{t('empty.noToolsSearch')}</Alert>
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
          <Typography color="text.secondary" variant="h6">{t('empty.accessRestricted')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('empty.noToolsPermission')}</Typography>
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
          <Typography color="text.secondary" variant="h6">{t('empty.accessRestricted')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('empty.noResourcesPermission')}</Typography>
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
          <ProjectControlsPanel
            projectId={id!}
            initialPaused={project.isPaused}
            initialMaintenance={project.maintenanceMode}
            initialAvailability={project.availabilityWindow}
            onPausedChange={setIsPaused}
          />
          <AlertConfigPanel projectId={id!} initialConfig={project.alertConfig} />
          <ResponseLimitPanel
            projectId={id!}
            initialConfig={project.responseConfig}
            onChange={(cfg) => setProject((prev) => prev ? { ...prev, responseConfig: cfg } : prev)}
          />
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
            <Typography color="text.secondary" variant="h6">{t('empty.accessRestricted')}</Typography>
            <Typography color="text.secondary" variant="body2">{t('empty.noSettingsPermission')}</Typography>
          </Box>
        )
      )}

      {/* ── Tab 7: Activity ───────────────────────────────────────────────────── */}
      {tab === 7 && (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>{t('heading.activityLog')}</Typography>
            <HelpButton title={t('heading.activityLog')}>
              <Typography variant="body2" gutterBottom>{t('help.activity.intro')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.activity.columns')}</Typography>
              <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2">{t('help.activity.greenStatus')}</Typography></Box>
                <Box component="li"><Typography variant="body2">{t('help.activity.redStatus')}</Typography></Box>
                <Box component="li"><Typography variant="body2">{t('help.activity.responseTime')}</Typography></Box>
                <Box component="li"><Typography variant="body2">{t('help.activity.sources')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>{t('help.activity.whenErrors')}</Typography>
              <Typography variant="body2">{t('help.activity.retention')}</Typography>
            </HelpButton>
          </Box>
          <ProjectLogs projectId={id!} />
        </>
      )}

      {/* ── Tab 8: AI View ────────────────────────────────────────────────────── */}
      {tab === 8 && (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>{t('heading.whatAiSees')}</Typography>
            <HelpButton title={t('heading.whatAiSees')}>
              <Typography variant="body2" gutterBottom>{t('help.aiView.desc')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.aiView.howAiDecides')}</Typography>
              <Typography variant="body2">{t('help.aiView.improving')}</Typography>
            </HelpButton>
          </Box>
          <McpDocsContent project={project} projectId={id!} />
        </>
      )}

      {/* ── Tab 9: Harness ────────────────────────────────────────────────────── */}
      {tab === 9 && (
        <HarnessTab
          projectId={id!}
          tools={project.tools ?? []}
          initialRateLimit={project.rateLimit}
          onRateLimitChange={(rl) => setProject((prev) => prev ? { ...prev, rateLimit: rl } : prev)}
        />
      )}

      {/* ── Tab 10: Guard Rails ───────────────────────────────────────────────── */}
      {tab === 10 && (
        <GuardRailsTab
          projectId={id!}
          tools={project.tools ?? []}
          initialAuth={project.auth}
          onAuthChange={(auth) => setProject((prev) => prev ? { ...prev, auth } : prev)}
        />
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
