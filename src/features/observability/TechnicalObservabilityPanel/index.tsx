import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconActivity,
  IconAdjustments,
  IconChartHistogram,
  IconCheck,
  IconClipboard,
  IconClock,
  IconDatabase,
  IconGauge,
  IconRefresh,
  IconRoute,
  IconServer,
  IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import {
  ENVIRONMENT_CONTROLS,
  defaultEnvironmentValues,
  formatEnvironmentValue,
  mergeEnvironmentValues,
  serializeEnvironmentValues,
} from '../environment-controls'

type EndpointStatus = 'checking' | 'ok' | 'error'

interface EndpointCheck {
  path: string
  labelKey: string
  status: EndpointStatus
  latencyMs?: number
  statusCode?: number
  detail?: string
}

interface MetricSummary {
  httpRequests: number
  httpErrors: number
  mcpToolCalls: number
  mcpToolErrors: number
  externalHttpCalls: number
  memoryBytes?: number
  eventLoopLagSeconds?: number
  uptimeSeconds?: number
}

interface SettingsResponse {
  observabilityEnvironment?: Record<string, string>
}

const ENDPOINTS: Array<Pick<EndpointCheck, 'path' | 'labelKey'>> = [
  { path: '/health', labelKey: 'runtime.health' },
  { path: '/ready', labelKey: 'runtime.ready' },
  { path: '/live', labelKey: 'runtime.live' },
  { path: '/metrics', labelKey: 'runtime.metrics' },
]

const SIGNALS = [
  { icon: IconChartHistogram, key: 'metrics', color: 'success.main' },
  { icon: IconActivity, key: 'correlation', color: 'warning.main' },
] as const


function metricSum(metrics: string, name: string): number {
  return metrics
    .split('\n')
    .filter((line) => line.startsWith(name) && !line.startsWith(`${name}_bucket`))
    .reduce((sum, line) => {
      const parts = line.trim().split(/\s+/)
      const value = Number(parts[parts.length - 1])
      return Number.isFinite(value) ? sum + value : sum
    }, 0)
}

function metricValue(metrics: string, name: string): number | undefined {
  const line = metrics.split('\n').find((entry) => entry.startsWith(name))
  if (!line) return undefined
  const parts = line.trim().split(/\s+/)
  const value = Number(parts[parts.length - 1])
  return Number.isFinite(value) ? value : undefined
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: 'compact' }).format(value)
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx += 1
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined) return 'n/a'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  return `${Math.floor(seconds / 3600)} h`
}

function parseMetricSummary(metrics: string): MetricSummary {
  return {
    httpRequests: metricSum(metrics, 'http_requests_total'),
    httpErrors: metricSum(metrics, 'http_requests_errors_total'),
    mcpToolCalls: metricSum(metrics, 'mcp_tool_calls_total'),
    mcpToolErrors: metricSum(metrics, 'mcp_tool_errors_total'),
    externalHttpCalls: metricSum(metrics, 'mcp_external_http_requests_total'),
    memoryBytes: metricValue(metrics, 'process_resident_memory_bytes'),
    eventLoopLagSeconds: metricValue(metrics, 'nodejs_eventloop_lag_seconds'),
    uptimeSeconds: metricValue(metrics, 'process_uptime_seconds'),
  }
}

function StatusChip({ status }: { status: EndpointStatus }) {
  const { t } = useTranslation(['observability', 'common'])
  if (status === 'checking') {
    return <Chip size="small" label={t('observability:status.checking')} />
  }
  return (
    <Chip
      size="small"
      color={status === 'ok' ? 'success' : 'error'}
      icon={status === 'ok' ? <IconCheck size={13} /> : <IconX size={13} />}
      label={status === 'ok' ? t('common:status.connected') : t('common:status.error')}
      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
    />
  )
}

function SectionTitle({ icon: Icon, title, action }: {
  icon: ElementType
  title: string
  action?: ReactNode
}) {
  return (
    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}><Icon size={18} /></Box>
      <Typography fontWeight={700} fontSize="0.9rem">{title}</Typography>
      <Box flexGrow={1} />
      {action}
    </Box>
  )
}

function EndpointRow({ endpoint }: { endpoint: EndpointCheck }) {
  const { t } = useTranslation('observability')
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: '1fr', sm: 'minmax(120px, 1fr) 120px 90px' }}
      gap={1}
      alignItems="center"
      sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
    >
      <Box>
        <Typography fontWeight={600} fontSize="0.82rem">{t(endpoint.labelKey)}</Typography>
        <Typography fontFamily="monospace" fontSize="0.75rem" color="text.secondary">{endpoint.path}</Typography>
      </Box>
      <StatusChip status={endpoint.status} />
      <Typography fontSize="0.75rem" color="text.secondary" textAlign={{ sm: 'right' }}>
        {endpoint.latencyMs !== undefined ? `${endpoint.latencyMs} ms` : endpoint.statusCode ?? ''}
      </Typography>
    </Box>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Tooltip title={copied ? t('action.copied') : label}>
      <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
        {copied ? <IconCheck size={15} /> : <IconClipboard size={15} />}
      </IconButton>
    </Tooltip>
  )
}

export function TechnicalObservabilityPanel() {
  const { t } = useTranslation(['observability', 'common'])
  const [checks, setChecks] = useState<EndpointCheck[]>(
    ENDPOINTS.map((endpoint) => ({ ...endpoint, status: 'checking' })),
  )
  const [environmentValues, setEnvironmentValues] = useState<Record<string, string>>(defaultEnvironmentValues)
  const [envLoading, setEnvLoading] = useState(true)
  const [metrics, setMetrics] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const summary = useMemo(() => parseMetricSummary(metrics), [metrics])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.all(ENDPOINTS.map(async (endpoint): Promise<EndpointCheck> => {
      const startedAt = performance.now()
      try {
        const response = await fetch(endpoint.path, { cache: 'no-store' })
        const latencyMs = Math.round(performance.now() - startedAt)
        const body = await response.text()
        if (endpoint.path === '/metrics' && response.ok) setMetrics(body)
        return {
          ...endpoint,
          status: response.ok ? 'ok' : 'error',
          statusCode: response.status,
          latencyMs,
          detail: body.slice(0, 160),
        }
      } catch (err) {
        return {
          ...endpoint,
          status: 'error',
          latencyMs: Math.round(performance.now() - startedAt),
          detail: err instanceof Error ? err.message : String(err),
        }
      }
    }))

    setChecks(results)
    setLastUpdated(new Date())
    setLoading(false)
    if (results.some((result) => result.status === 'error')) {
      setError(t('observability:error.runtimeLoadFailed'))
    }
  }, [t])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setEnvLoading(true)
    api.get<SettingsResponse>('/settings')
      .then((response) => {
        setEnvironmentValues(mergeEnvironmentValues(response.data.observabilityEnvironment))
      })
      .catch(() => {})
      .finally(() => setEnvLoading(false))
  }, [])

  const metricCards = [
    { label: t('observability:metric.httpRequests'), value: formatCompact(summary.httpRequests), icon: IconGauge },
    { label: t('observability:metric.httpErrors'), value: formatCompact(summary.httpErrors), icon: IconActivity },
    { label: t('observability:metric.mcpToolCalls'), value: formatCompact(summary.mcpToolCalls), icon: IconRoute },
    { label: t('observability:metric.mcpToolErrors'), value: formatCompact(summary.mcpToolErrors), icon: IconX },
    { label: t('observability:metric.externalHttp'), value: formatCompact(summary.externalHttpCalls), icon: IconServer },
    { label: t('observability:metric.memory'), value: formatBytes(summary.memoryBytes), icon: IconDatabase },
    { label: t('observability:metric.eventLoop'), value: formatDuration(summary.eventLoopLagSeconds), icon: IconClock },
    { label: t('observability:metric.uptime'), value: formatDuration(summary.uptimeSeconds), icon: IconClock },
  ]

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2.5} flexWrap="wrap">
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><IconActivity size={21} /></Box>
            <Typography variant="h5" fontWeight={700}>{t('observability:heading.title')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">{t('observability:heading.subtitle')}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {t('observability:runtime.updated', { time: lastUpdated.toLocaleTimeString() })}
            </Typography>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            onClick={refresh}
            disabled={loading}
          >
            {t('common:action.reload')}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <SectionTitle icon={IconServer} title={t('observability:section.runtime')} />
            {checks.map((endpoint) => <EndpointRow key={endpoint.path} endpoint={endpoint} />)}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <SectionTitle icon={IconActivity} title={t('observability:section.signals')} />
            <Grid container spacing={1.25}>
              {SIGNALS.map(({ icon: Icon, key, color }) => (
                <Grid item xs={12} sm={6} key={key}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25, height: '100%' }}>
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                      <Box sx={{ color, display: 'flex' }}><Icon size={16} /></Box>
                      <Typography fontWeight={700} fontSize="0.82rem">{t(`observability:signal.${key}.title`)}</Typography>
                    </Box>
                    <Typography fontSize="0.75rem" color="text.secondary">{t(`observability:signal.${key}.detail`)}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <SectionTitle icon={IconChartHistogram} title={t('observability:section.metrics')} />
            <Grid container spacing={1.25}>
              {metricCards.map(({ label, value, icon: Icon }) => (
                <Grid item xs={6} md={3} key={label}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
                      <Box sx={{ color: 'text.secondary', display: 'flex' }}><Icon size={15} /></Box>
                      <Typography color="text.secondary" fontSize="0.72rem" fontWeight={700}>{label}</Typography>
                    </Box>
                    <Typography fontWeight={700} fontSize="1rem">{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <SectionTitle
              icon={IconAdjustments}
              title={t('observability:section.configuration')}
              action={!envLoading ? <CopyButton value={serializeEnvironmentValues(environmentValues)} label={t('common:action.copy')} /> : undefined}
            />
            {envLoading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {ENVIRONMENT_CONTROLS.map((control) => (
                  <Box
                    key={control.name}
                    display="grid"
                    gridTemplateColumns={{ xs: '1fr auto', sm: 'minmax(180px, 1fr) auto' }}
                    alignItems="center"
                    gap={1}
                    py={0.85}
                  >
                    <Typography fontFamily="monospace" fontSize="0.76rem" fontWeight={700}>
                      {control.name}
                    </Typography>
                    <Typography fontFamily="monospace" fontSize="0.75rem" color="text.secondary" textAlign="right">
                      {formatEnvironmentValue(environmentValues[control.name] ?? '')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  )
}
