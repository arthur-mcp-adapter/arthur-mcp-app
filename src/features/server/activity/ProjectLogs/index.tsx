import { useEffect, useState } from 'react'
import {
  Box, Button, Chip, CircularProgress, Collapse, IconButton, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import type { ExecLog } from '../../types'

export function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: color ? `${color}44` : 'divider' }}>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  const { t } = useTranslation('serverDetail')
  if (value === undefined || value === null) {
    return <Typography fontSize="0.78rem" color="text.disabled" fontStyle="italic">{t('logs.noPayload')}</Typography>
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <Box
      component="pre"
      sx={{
        m: 0, p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: 300,
        overflowY: 'auto',
      }}
    >
      {text}
    </Box>
  )
}

function LogRow({ log }: { log: ExecLog }) {
  const { t } = useTranslation('serverDetail')
  const [open, setOpen] = useState(false)
  const hasPayload = log.requestPayload !== undefined || log.responsePayload !== undefined

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > td': { border: open ? 0 : undefined },
          bgcolor: log.isError ? 'error.light' : undefined,
          cursor: hasPayload ? 'pointer' : 'default',
        }}
        onClick={() => hasPayload && setOpen((o) => !o)}
      >
        <TableCell padding="checkbox" sx={{ pl: 1 }}>
          {hasPayload ? (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
              aria-label={t('logs.expand')} sx={{ p: 0.5 }}>
              {open ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
            </IconButton>
          ) : <Box sx={{ width: 24 }} />}
        </TableCell>
        <TableCell>
          <Typography fontSize="0.78rem" color="text.secondary" whiteSpace="nowrap">
            {new Date(log.createdAt).toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography fontSize="0.875rem" fontWeight={500} fontFamily="monospace">{log.toolName}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={log.source === 'mcp' ? t('logs.mcp') : t('logs.direct')} size="small"
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

      {hasPayload && (
        <TableRow sx={{ '&:last-child td': { border: 0 } }}>
          <TableCell colSpan={7} sx={{ py: 0 }}>
            <Collapse in={open} unmountOnExit>
              <Box display="flex" gap={2} p={1.5} flexWrap="wrap">
                <Box flex={1} minWidth={260}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={0.5}>
                    {t('logs.requestPayload')}
                  </Typography>
                  <JsonBlock value={log.requestPayload} />
                </Box>
                <Box flex={1} minWidth={260}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={0.5}>
                    {t('logs.responsePayload')}
                  </Typography>
                  <JsonBlock value={log.responsePayload} />
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function ProjectLogs({ projectId }: { projectId: string }) {
  const { t } = useTranslation('serverDetail')
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
        <Typography variant="subtitle1" fontWeight={700}>
          {t('logs.callHistory')} — {t('logs.records', { count: total })}
        </Typography>
        <Button size="small" onClick={() => load(0)}>{t('logs.refresh')}</Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ pl: 1, width: 32 }} />
              {[t('logs.dateTime'), t('logs.tool'), t('logs.source'), t('logs.status'), t('logs.timeMs'), t('logs.errorCol')].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" fontSize="0.85rem" py={2} textAlign="center">
                    {t('logs.noLogs')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <LogRow key={log._id} log={log} />
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button size="small" disabled={skip === 0} onClick={() => load(Math.max(0, skip - LIMIT))}>
          {t('logs.prev')}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t('logs.of', { from: skip + 1, to: Math.min(skip + LIMIT, total), total })}
        </Typography>
        <Button size="small" disabled={skip + LIMIT >= total} onClick={() => load(skip + LIMIT)}>
          {t('logs.next')}
        </Button>
      </Box>
    </Box>
  )
}
