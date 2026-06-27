import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import api from '../../../api'
import type { ExecLog } from '../types'

export function ProjectLogs({ projectId }: { projectId: string }) {
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
