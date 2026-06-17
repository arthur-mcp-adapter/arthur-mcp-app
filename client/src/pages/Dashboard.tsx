import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconFolder,
  IconTool,
  IconCircleCheck,
  IconLock,
  IconAlertTriangle,
  IconRefresh,
  IconTrendingUp,
} from '@tabler/icons-react'
import api from '../api'
import HelpButton from '../components/HelpButton'
import { STATUS_COLORS } from '../theme/index'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashStats {
  period: { from: string; to: string }
  projects: { total: number; withApiKey: number; active: number }
  tools: { total: number }
  calls: { total: number; errors: number; successRate: number }
  topTools: { toolName: string; count: number; projectName: string }[]
  callsByBucket: { _id: string; calls: number; errors: number }[]
  recentProjects: { _id: string; name: string; toolCount: number; status: string; tags: string[] }[]
}

interface HealthEntry {
  projectId: string
  projectName: string
  isPaused: boolean
  errorRatePct: number
  totalCalls: number
}

// ─── Period presets ────────────────────────────────────────────────────────────

type Preset = '24h' | '7d' | '30d' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Today', value: '24h' },
  { label: 'This week', value: '7d' },
  { label: 'This month', value: '30d' },
  { label: 'Custom', value: 'custom' },
]

function presetToDates(preset: Preset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = new Date()
  if (preset === '24h') return { from: new Date(to.getTime() - 24 * 60 * 60 * 1000), to }
  if (preset === '7d') return { from: new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000), to }
  if (preset === '30d') return { from: new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000), to }
  const from = customFrom ? new Date(customFrom) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
  const toCustom = customTo ? new Date(customTo + 'T23:59:59') : to
  return { from, to: toCustom }
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function presetLabel(preset: Preset): string {
  if (preset === '24h') return 'in the last 24 hours'
  if (preset === '7d') return 'in the last 7 days'
  if (preset === '30d') return 'in the last 30 days'
  return 'in the selected period'
}

// ─── Summary banner ────────────────────────────────────────────────────────────

function SummaryBanner({ stats, preset }: { stats: DashStats; preset: Preset }) {
  const { calls, projects } = stats
  const period = presetLabel(preset)
  const successes = calls.total - calls.errors

  let severity: 'success' | 'warning' | 'error' | 'info' = 'info'
  let message: string

  if (calls.total === 0) {
    severity = 'info'
    message = `Your AI assistant has not been used yet ${period}. Once you connect an AI client to a project, its activity will appear here.`
  } else if (calls.errors === 0) {
    severity = 'success'
    message = `Everything is running smoothly. Your AI completed all ${calls.total.toLocaleString()} task${calls.total !== 1 ? 's' : ''} successfully ${period}.`
  } else if (calls.successRate >= 80) {
    severity = 'warning'
    message = `Your AI ran ${calls.total.toLocaleString()} task${calls.total !== 1 ? 's' : ''} ${period}. ${successes.toLocaleString()} went well — ${calls.errors.toLocaleString()} had issues. Check the projects below for details.`
  } else {
    severity = 'error'
    message = `Attention needed. ${calls.errors.toLocaleString()} out of ${calls.total.toLocaleString()} task${calls.total !== 1 ? 's' : ''} had problems ${period}. Please review your project settings.`
  }

  if (projects.total === 0) {
    severity = 'info'
    message = "You have no projects yet. Create your first project to start connecting your AI assistant to an API."
  }

  return <Alert severity={severity} icon={severity === 'success' ? <IconCircleCheck size={20} /> : undefined} sx={{ mb: 3, fontSize: '0.95rem' }}>{message}</Alert>
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, color, headline, subline, helpTitle, helpContent }: {
  icon: React.ReactNode
  color: string
  headline: React.ReactNode
  subline?: string
  helpTitle?: string
  helpContent?: React.ReactNode
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${color}18`, color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{headline}</Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.4}>
            {subline && <Typography variant="body2" color="text.secondary">{subline}</Typography>}
            {helpTitle && helpContent && <HelpButton title={helpTitle}>{helpContent}</HelpButton>}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Bar chart ─────────────────────────────────────────────────────────────────

function CallsChart({ data, preset }: { data: DashStats['callsByBucket']; preset: Preset }) {
  if (!data.length) return <Typography color="text.secondary" fontSize="0.85rem">No activity during this period.</Typography>

  const maxCalls = Math.max(...data.map((d) => d.calls), 1)

  const formatLabel = (id: string) => {
    if (preset === '24h') return id.slice(11, 16)
    if (id.includes('W')) return id
    return id.slice(5)
  }

  return (
    <Box display="flex" alignItems="flex-end" gap="4px" height={90}>
      {data.map((d) => (
        <Tooltip key={d._id} title={`${formatLabel(d._id)}: ${d.calls} request${d.calls !== 1 ? 's' : ''}, ${d.errors} failed`}>
          <Box flex={1} display="flex" flexDirection="column" alignItems="center" gap="3px" minWidth={0}>
            <Box sx={{
              width: '100%',
              height: `${Math.round((d.calls / maxCalls) * 75)}px`,
              bgcolor: d.errors > 0 ? (d.errors === d.calls ? '#fa896b' : '#FFAE1F') : '#5D87FF',
              borderRadius: '3px 3px 0 0',
              minHeight: 4,
              transition: 'height 0.3s ease',
            }} />
            <Typography fontSize="0.58rem" color="text.disabled" noWrap sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatLabel(d._id)}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}

// ─── Project health row ────────────────────────────────────────────────────────

function HealthDot({ errorRatePct, isPaused, totalCalls }: { errorRatePct: number; isPaused: boolean; totalCalls: number }) {
  if (isPaused) return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.inactive, flexShrink: 0 }} />
  if (totalCalls === 0) return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e0e0e0', flexShrink: 0 }} />
  const color = errorRatePct === 0 ? STATUS_COLORS.healthy : errorRatePct < 20 ? STATUS_COLORS.warning : STATUS_COLORS.critical
  return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
}

function healthStatusText(h: HealthEntry): string {
  if (h.isPaused) return 'Paused'
  if (h.totalCalls === 0) return 'No activity in the last hour'
  if (h.errorRatePct === 0) return `${h.totalCalls} request${h.totalCalls !== 1 ? 's' : ''}, all succeeded`
  return `${h.totalCalls} request${h.totalCalls !== 1 ? 's' : ''}, ${h.errorRatePct}% failed`
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [health, setHealth] = useState<HealthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState<Preset>('24h')
  const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()))
  const navigate = useNavigate()

  const load = useCallback((p: Preset, cf?: string, ct?: string) => {
    const { from, to } = presetToDates(p, cf, ct)
    setLoading(true)
    setError('')
    Promise.all([
      api.get<DashStats>('/dashboard/stats', { params: { from: from.toISOString(), to: to.toISOString() } }),
      api.get<HealthEntry[]>('/dashboard/health-summary').catch(() => ({ data: [] as HealthEntry[] })),
    ])
      .then(([statsRes, healthRes]) => {
        setStats(statsRes.data)
        setHealth(healthRes.data)
      })
      .catch(() => setError('Failed to load the dashboard. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(preset, customFrom, customTo) }, [])

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') load(p)
  }

  const handleCustomApply = () => load('custom', customFrom, customTo)

  // Derive plain-English headline values from stats
  const taskSentence = stats
    ? stats.calls.total === 0
      ? 'No tasks yet'
      : `${stats.calls.total.toLocaleString()} task${stats.calls.total !== 1 ? 's' : ''} run`
    : '—'

  const successSentence = stats
    ? stats.calls.total === 0
      ? 'Nothing to report'
      : stats.calls.errors === 0
        ? 'All succeeded'
        : `${stats.calls.successRate}% succeeded`
    : '—'

  return (
    <Box py={3} px={0}>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">Activity Overview</Typography>
            <HelpButton title="Activity Overview">
              <Typography variant="body2" gutterBottom>
                This page shows you what your AI assistant has been doing — how many tasks it ran, whether they succeeded, and which integrations are healthy right now.
              </Typography>
              <Typography variant="body2" gutterBottom>
                You don't need any technical knowledge to read this page. The summary at the top always gives you the most important information in plain English.
              </Typography>
              <Typography variant="body2">
                Use the period selector in the top-right to switch between today, this week, this month, or a custom date range. All numbers update automatically.
              </Typography>
            </HelpButton>
          </Box>
          {stats && (
            <Typography variant="caption" color="text.secondary">
              {new Date(stats.period.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' → '}
              {new Date(stats.period.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </Box>

        {/* Period selector */}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <ButtonGroup size="small" variant="outlined">
            {PRESETS.map((p) => (
              <Button key={p.value} onClick={() => handlePreset(p.value)} variant={preset === p.value ? 'contained' : 'outlined'}>
                {p.label}
              </Button>
            ))}
          </ButtonGroup>
          <Tooltip title="Refresh">
            <span>
              <Button size="small" variant="outlined" onClick={() => load(preset, customFrom, customTo)} disabled={loading}>
                <IconRefresh size={18} />
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          <Button variant="contained" size="small" onClick={handleCustomApply}>Apply</Button>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <>
          <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 2, mb: 3 }} />
          <Grid container spacing={2} mb={3}>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} lg={3} key={i}>
                <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        </>
      ) : !stats ? null : (
        <>
          {/* Summary banner */}
          <SummaryBanner stats={stats} preset={preset} />

          {/* Stat cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconTrendingUp size={20} />} color="#5D87FF"
                headline={taskSentence}
                subline={successSentence}
                helpTitle="How many tasks your AI ran"
                helpContent={
                  <Typography variant="body2">
                    Each time your AI assistant calls one of your integrations — for example "look up this customer" or "create a new ticket" — that counts as one task. The number here shows the total for the selected period.
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconFolder size={20} />} color="#13DEB9"
                headline={`${stats.projects.total} integration${stats.projects.total !== 1 ? 's' : ''}`}
                subline={stats.projects.total === 0 ? 'None set up yet' : `${stats.projects.active} running normally`}
                helpTitle="Your integrations"
                helpContent={
                  <Typography variant="body2">
                    Each integration connects one of your APIs (CRM, ticketing system, database, etc.) to your AI assistant. Once connected, the AI can query and update that system in any conversation.
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconTool size={20} />} color="#FFAE1F"
                headline={`${stats.tools.total} action${stats.tools.total !== 1 ? 's' : ''}`}
                subline="things your AI can do"
                helpTitle="Actions available to your AI"
                helpContent={
                  <Typography variant="body2">
                    Each "action" is something specific your AI can do — like "search for a contact", "create an order", or "get project status". More actions means your AI can help with more tasks.
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconLock size={20} />} color="#FA896B"
                headline={`${stats.projects.withApiKey} of ${stats.projects.total} secured`}
                subline="with access control"
                helpTitle="Security"
                helpContent={
                  <Typography variant="body2">
                    Secured integrations require a secret key before an AI client can connect. This prevents unauthorised access. It is recommended to protect all integrations that connect to real production data.
                  </Typography>
                }
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Activity chart */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Activity over time</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Each bar is one time slot. Hover for exact numbers. Blue = all ok · Yellow = some issues · Red = all failed.
                </Typography>
                <CallsChart data={stats.callsByBucket} preset={preset} />
              </Paper>
            </Grid>

            {/* Success breakdown */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>How did tasks go?</Typography>
                {stats.calls.total === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">No activity yet in this period.</Typography>
                ) : (
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">Completed successfully</Typography>
                      <Typography fontSize="0.82rem" fontWeight={600} color="success.main">
                        {(stats.calls.total - stats.calls.errors).toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={stats.calls.successRate} color="success" sx={{ mb: 1.5, height: 8, borderRadius: 4 }} />

                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">Had a problem</Typography>
                      <Typography fontSize="0.82rem" fontWeight={600} color={stats.calls.errors > 0 ? 'error.main' : 'text.secondary'}>
                        {stats.calls.errors.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={100 - stats.calls.successRate} color={stats.calls.errors > 0 ? 'error' : 'inherit'} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                )}

                {stats.calls.errors > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <Box sx={{ color: 'warning.main', mt: '1px', flexShrink: 0 }}><IconAlertTriangle size={18} /></Box>
                      <Typography fontSize="0.82rem" color="text.secondary">
                        {stats.calls.errors === 1
                          ? '1 task had an issue. Open the relevant project and check its logs to see what went wrong.'
                          : `${stats.calls.errors} tasks had issues. Open the affected projects and check their logs to find out what went wrong.`}
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>

            {/* What the AI used most */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>What your AI used most</Typography>
                  <HelpButton title="Most-used actions">
                    <Typography variant="body2">
                      The actions your AI assistant called most often in the selected period. High-use actions are the most important for your team — make sure they are configured correctly and their descriptions are clear.
                    </Typography>
                  </HelpButton>
                </Box>
                {stats.topTools.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">No activity yet — your AI hasn't run any tasks in this period.</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.2}>
                    {stats.topTools.map((t, i) => (
                      <Box key={t.toolName} display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography fontSize="0.72rem" color="text.disabled" width={18} textAlign="right">{i + 1}</Typography>
                          <Box>
                            <Typography fontSize="0.875rem" fontWeight={500}>{t.toolName.replace(/_/g, ' ')}</Typography>
                            <Typography fontSize="0.72rem" color="text.secondary">{t.projectName}</Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${t.count}×`} size="small"
                          sx={{ fontWeight: 700, bgcolor: '#5D87FF18', color: '#5D87FF', height: 22, fontSize: '0.75rem' }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Project status right now */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Status right now</Typography>
                  <HelpButton title="Live project status">
                    <Typography variant="body2" gutterBottom>
                      Shows the current health of each integration based on the last hour of activity.
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                      {([
                        ['Green dot', 'All requests succeeded in the last hour.'],
                        ['Yellow dot', 'Some requests had issues (1–19% failure rate).'],
                        ['Red dot', 'Many requests are failing (20%+ failure rate). Needs attention.'],
                        ['Grey dot', 'No activity in the last hour, or the integration is paused.'],
                      ] as [string, string][]).map(([l, d]) => (
                        <Box component="li" key={l} sx={{ mb: 0.5 }}>
                          <Typography variant="body2"><strong>{l}</strong> — {d}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </HelpButton>
                </Box>
                {health.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">No integrations yet.</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {health.map((h) => (
                      <Box
                        key={h.projectId}
                        display="flex" alignItems="center" justifyContent="space-between"
                        sx={{ cursor: 'pointer', '&:hover': { opacity: 0.75 } }}
                        onClick={() => navigate(`/projects/${h.projectId}`)}
                      >
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <HealthDot errorRatePct={h.errorRatePct} isPaused={h.isPaused} totalCalls={h.totalCalls} />
                          <Box>
                            <Typography fontSize="0.875rem" fontWeight={500}>{h.projectName}</Typography>
                            <Typography fontSize="0.72rem" color="text.secondary">{healthStatusText(h)}</Typography>
                          </Box>
                        </Box>
                        {h.isPaused && <Chip label="Paused" size="small" sx={{ bgcolor: '#9e9e9e', color: '#fff', height: 20, fontSize: '0.7rem' }} />}
                        {!h.isPaused && h.errorRatePct > 20 && <Chip label="Check this" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />}
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}
