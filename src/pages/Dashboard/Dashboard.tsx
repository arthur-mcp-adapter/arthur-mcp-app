import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Grid,
  IconButton,
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
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { HelpButton } from '../../components'
import { STATUS_COLORS } from '../../theme/index'
import { type Preset, presetToDates, toInputDate } from '../../utils/dateRange'
import type { DashStats } from './dashStats.interface'
import type { HealthEntry } from './healthEntry.interface'
import { useHealthStatusText } from './hooks/useHealthStatusText.hook'
import type { SummaryBannerProps } from './summaryBannerProps.interface'
import type { StatCardProps } from './statCardProps.interface'
import type { CallsChartProps } from './callsChartProps.interface'
import type { HealthDotProps } from './healthDotProps.interface'





// ─── Summary banner ────────────────────────────────────────────────────────────

function SummaryBanner({ stats, preset }: SummaryBannerProps) {
  const { t } = useTranslation('dashboard')
  const { calls, projects } = stats
  const period = t(`period.${preset === 'custom' ? 'selected' : `last${preset}`}`)
  const successes = calls.total - calls.errors

  let severity: 'success' | 'warning' | 'error' | 'info' = 'info'
  let message: string

  if (calls.total === 0) {
    severity = 'info'
    message = t('banner.noActivity', { period })
  } else if (calls.errors === 0) {
    severity = 'success'
    message = t('banner.allGood', { count: calls.total, total: calls.total, period })
  } else if (calls.successRate >= 80) {
    severity = 'warning'
    message = t('banner.someErrors', { count: calls.total, total: calls.total, successes: successes.toLocaleString(), errors: calls.errors.toLocaleString(), period })
  } else {
    severity = 'error'
    message = t('banner.manyErrors', { count: calls.total, total: calls.total, errors: calls.errors.toLocaleString(), period })
  }

  if (projects.total === 0) {
    severity = 'info'
    message = t('banner.noServers')
  }

  return <Alert severity={severity} icon={severity === 'success' ? <IconCircleCheck size={20} /> : undefined} sx={{ mb: 3, fontSize: '0.95rem' }}>{message}</Alert>
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, color, headline, subline, helpTitle, helpContent }: StatCardProps) {
  return (
    <Paper variant="outlined" sx={{ height: '100%', p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'action.hover', color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{headline}</Typography>
        <Box display="flex" alignItems="center" gap={0.5} mt={0.4}>
          {subline && <Typography variant="body2" color="text.secondary">{subline}</Typography>}
          {helpTitle && helpContent && <HelpButton title={helpTitle}>{helpContent}</HelpButton>}
        </Box>
      </Box>
    </Paper>
  )
}

// ─── Bar chart ─────────────────────────────────────────────────────────────────

function CallsChart({ data, preset }: CallsChartProps) {
  const { t } = useTranslation('dashboard')
  if (!data.length) return <Typography color="text.secondary" fontSize="0.85rem">{t('chart.noActivity')}</Typography>

  const maxCalls = Math.max(...data.map((d) => d.calls), 1)

  const formatLabel = (id: string) => {
    if (preset === '24h') return id.slice(11, 16)
    if (id.includes('W')) return id
    return id.slice(5)
  }

  return (
    <Box display="flex" alignItems="flex-end" gap="4px" height={90}>
      {data.map((d) => (
        <Tooltip key={d._id} title={t('chart.barTooltip', { count: d.calls, label: formatLabel(d._id), calls: d.calls, errors: d.errors })}>
          <Box flex={1} display="flex" flexDirection="column" alignItems="center" gap="3px" minWidth={0}>
            <Box sx={{
              width: '100%',
              height: `${Math.round((d.calls / maxCalls) * 75)}px`,
              bgcolor: d.errors > 0 ? (d.errors === d.calls ? 'error.light' : 'warning.main') : 'primary.main',
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

function HealthDot({ errorRatePct, isPaused, totalCalls }: HealthDotProps) {
  if (isPaused) return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.inactive, flexShrink: 0 }} />
  if (totalCalls === 0) return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'action.disabledBackground', flexShrink: 0 }} />
  const color = errorRatePct === 0 ? STATUS_COLORS.healthy : errorRatePct < 20 ? STATUS_COLORS.warning : STATUS_COLORS.critical
  return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { can, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [health, setHealth] = useState<HealthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState<Preset>('24h')
  const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()))
  const navigate = useNavigate()
  const { t } = useTranslation('dashboard')
  const healthStatusText = useHealthStatusText()

  const PRESETS: { label: string; value: Preset }[] = [
    { label: t('period.24h'), value: '24h' },
    { label: t('period.7d'), value: '7d' },
    { label: t('period.30d'), value: '30d' },
    { label: t('period.custom'), value: 'custom' },
  ]

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
      .catch((err) => {
        if (err?.response?.status === 403) setError('forbidden')
        else setError(t('error.loadFailed'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (authLoading) return
    if (!can(Permission.ServersView)) { setLoading(false); return }
    load(preset, customFrom, customTo)
  }, [authLoading])

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') load(p)
  }

  const handleCustomApply = () => load('custom', customFrom, customTo)

  // Derive plain-English headline values from stats
  const taskSentence = stats
    ? stats.calls.total === 0
      ? t('stat.noTasksYet')
      : t('stat.tasksHeadline', { count: stats.calls.total })
    : '—'

  const successSentence = stats
    ? stats.calls.total === 0
      ? t('stat.nothingToReport')
      : stats.calls.errors === 0
        ? t('stat.allSucceeded')
        : t('stat.successRate', { rate: stats.calls.successRate })
    : '—'

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('heading.title')}</Typography>
            <HelpButton title={t('heading.title')}>
              <Typography variant="body2" gutterBottom>{t('help.overviewIntro')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.overviewReadability')}</Typography>
              <Typography variant="body2">{t('help.overviewPeriod')}</Typography>
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
          <Tooltip title={t('action.refresh')}>
            <span>
              <IconButton size="small" onClick={() => load(preset, customFrom, customTo)} disabled={loading}>
                <IconRefresh size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField size="small" type="date" label={t('period.from')} InputLabelProps={{ shrink: true }} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <TextField size="small" type="date" label={t('period.to')} InputLabelProps={{ shrink: true }} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          <Button variant="contained" size="small" onClick={handleCustomApply}>{t('period.apply')}</Button>
        </Paper>
      )}

      {error === 'forbidden' ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
          <Typography color="text.secondary" variant="h6">{t('error.forbidden')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('error.forbiddenDetail')}</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : null}

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
                helpTitle={t('help.tasksTitle')}
                helpContent={
                  <>
                    <Typography variant="body2" gutterBottom>{t('help.tasksContent')}</Typography>
                    <Typography variant="body2">{t('help.tasksWhenFail')}</Typography>
                  </>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconFolder size={20} />} color="#13DEB9"
                headline={t('stat.integrations', { count: stats.projects.total })}
                subline={stats.projects.total === 0 ? t('stat.noneYet') : t('stat.runningNormally', { count: stats.projects.active })}
                helpTitle={t('help.integrationsTitle')}
                helpContent={
                  <>
                    <Typography variant="body2" gutterBottom>{t('help.integrationsContent')}</Typography>
                    <Typography variant="body2">{t('help.integrationsTip')}</Typography>
                  </>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconTool size={20} />} color="#FFAE1F"
                headline={t('stat.actions', { count: stats.tools.total })}
                subline={t('stat.thingsAiCanDo')}
                helpTitle={t('help.actionsTitle')}
                helpContent={
                  <>
                    <Typography variant="body2" gutterBottom>{t('help.actionsContent')}</Typography>
                    <Typography variant="body2">{t('help.actionsTip')}</Typography>
                  </>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={<IconLock size={20} />} color="#FA896B"
                headline={t('stat.secured', { with: stats.projects.withApiKey, total: stats.projects.total })}
                subline={t('stat.withAccessControl')}
                helpTitle={t('help.securityTitle')}
                helpContent={
                  <>
                    <Typography variant="body2" gutterBottom>{t('help.securityContent')}</Typography>
                    <Typography variant="body2">{t('help.securityTip')}</Typography>
                  </>
                }
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Activity chart */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>{t('chart.title')}</Typography>
                  <HelpButton title={t('help.chartTitle')}>
                    <Typography variant="body2">
                      {t('help.chartHint')}
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                      {([
                        ['Blue', t('help.chartBlue')],
                        ['Yellow', t('help.chartYellow')],
                        ['Red', t('help.chartRed')],
                      ] as [string, string][]).map(([l, d]) => (
                        <Box component="li" key={l}><Typography variant="body2"><strong>{l}</strong> — {d}</Typography></Box>
                      ))}
                    </Box>
                  </HelpButton>
                </Box>
                <CallsChart data={stats.callsByBucket} preset={preset} />
              </Paper>
            </Grid>

            {/* Success breakdown */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>{t('tasks.title')}</Typography>
                {stats.calls.total === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">{t('tasks.noActivity')}</Typography>
                ) : (
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">{t('tasks.completedSuccessfully')}</Typography>
                      <Typography fontSize="0.82rem" fontWeight={600} color="success.main">
                        {(stats.calls.total - stats.calls.errors).toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={stats.calls.successRate} color="success" sx={{ mb: 1.5, height: 8, borderRadius: 4 }} />

                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">{t('tasks.hadProblem')}</Typography>
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
                        {t('tasks.issueHint', { count: stats.calls.errors })}
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
                  <Typography variant="subtitle1" fontWeight={700}>{t('topTools.title')}</Typography>
                  <HelpButton title={t('help.topActionsTitle')}>
                    <Typography variant="body2">
                      {t('help.topActionsContent')}
                    </Typography>
                  </HelpButton>
                </Box>
                {stats.topTools.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">{t('topTools.noActivity')}</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.2}>
                    {stats.topTools.map((tool, i) => (
                      <Box key={tool.toolName} display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography fontSize="0.72rem" color="text.disabled" width={18} textAlign="right">{i + 1}</Typography>
                          <Box>
                            <Typography fontSize="0.875rem" fontWeight={500}>{tool.toolName.replace(/_/g, ' ')}</Typography>
                            <Typography fontSize="0.72rem" color="text.secondary">{tool.serverName}</Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${tool.count}×`} size="small" color="primary" variant="outlined"
                          sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
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
                  <Typography variant="subtitle1" fontWeight={700}>{t('healthStatus.title')}</Typography>
                  <HelpButton title={t('help.statusTitle')}>
                    <Typography variant="body2" gutterBottom>
                      {t('help.statusHint')}
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                      {([
                        ['Green dot', t('help.statusGreen')],
                        ['Yellow dot', t('help.statusYellow')],
                        ['Red dot', t('help.statusRed')],
                        ['Grey dot', t('help.statusGrey')],
                      ] as [string, string][]).map(([l, d]) => (
                        <Box component="li" key={l} sx={{ mb: 0.5 }}>
                          <Typography variant="body2"><strong>{l}</strong> — {d}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </HelpButton>
                </Box>
                {health.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">{t('healthStatus.noIntegrations')}</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {health.map((h) => (
                      <Box
                        key={h.projectId}
                        display="flex" alignItems="center" justifyContent="space-between"
                        sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/servers/${h.projectId}`)}
                      >
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <HealthDot errorRatePct={h.errorRatePct} isPaused={h.isPaused} totalCalls={h.totalCalls} />
                          <Box>
                            <Typography fontSize="0.875rem" fontWeight={500}>{h.serverName}</Typography>
                            <Typography fontSize="0.72rem" color="text.secondary">{healthStatusText(h)}</Typography>
                          </Box>
                        </Box>
                        {h.isPaused && <Chip label={t('healthStatus.paused')} size="small" sx={{ bgcolor: 'text.disabled', color: 'background.paper', height: 20, fontSize: '0.7rem' }} />}
                        {!h.isPaused && h.errorRatePct > 20 && <Chip label={t('healthStatus.checkThis')} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />}
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
