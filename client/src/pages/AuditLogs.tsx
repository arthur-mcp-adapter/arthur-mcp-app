import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { IconRefresh, IconEye, IconEyeOff } from '@tabler/icons-react'
import api from '../api'
import HelpButton from '../components/HelpButton'

interface AuditEntry {
  _id: string
  userId?: string
  username: string
  action: string
  entity: string
  entityId?: string
  entityName?: string
  details?: string
  ip?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  create: 'success',
  update: 'warning',
  delete: 'error',
  generate_key: 'default',
  revoke_key: 'error',
  login: 'default',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  generate_key: 'Generated key',
  revoke_key: 'Revoked key',
  login: 'Login',
}

const ENTITY_LABELS: Record<string, string> = {
  project: 'Project',
  user: 'User',
  tool: 'Tool',
  settings: 'Settings',
  'api-key': 'API Key',
}

const LIMIT = 50

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skip, setSkip] = useState(0)
  const [showIp, setShowIp] = useState(false)

  const currentPage = Math.floor(skip / LIMIT) + 1
  const pageCount = Math.max(1, Math.ceil(total / LIMIT))

  const load = (s = 0) => {
    setLoading(true)
    api.get<{ logs: AuditEntry[]; total: number }>(`/audit-logs?limit=${LIMIT}&skip=${s}`)
      .then((r) => {
        setLogs(r.data.logs)
        setTotal(r.data.total)
        setSkip(s)
      })
      .catch(() => setError('Failed to load logs. Administrator access required.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    load((page - 1) * LIMIT)
  }

  return (
    <Box py={3} px={0}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">Audit Logs</Typography>
          <HelpButton title="Audit Logs">
            <Typography variant="body2" gutterBottom>
              The Audit Log is a complete, tamper-proof record of every administrative change made on this Arthur MCP Adapter server. It is intended for security monitoring, compliance auditing, and debugging unexpected behaviour.
            </Typography>
            <Typography variant="body2" gutterBottom>
              Every time a user creates, modifies, or deletes a project, tool, API key, or system setting, an entry is automatically written here. Login events are also recorded. <strong>Entries cannot be edited or deleted by any user.</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>How to use it:</Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>Investigate a change:</strong> Look at the Date/Time and Item columns to find when and what was changed.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Find out who did something:</strong> The User column shows which account performed the action.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Security incident response:</strong> The IP column shows where the request came from — useful for identifying unauthorised access.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Compliance reviews:</strong> Share the log with auditors to demonstrate that configuration changes are tracked.</Typography></Box>
            </Box>
            <Typography variant="body2">
              Logs are stored in memory and retained for <strong>30 days</strong>. They are reset when the server restarts — export important entries before performing maintenance windows.
            </Typography>
          </HelpButton>
        </Box>
        <Tooltip title="Refresh">
          <Button size="small" variant="outlined" startIcon={<IconRefresh size={18} />} onClick={() => load(skip)}>
            Refresh
          </Button>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2.5}>
        Record of all administrative actions.{total > 0 && ` ${total} entries total.`}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
          <Table size="small">
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={70} /></TableCell>
                  <TableCell><Skeleton width={60} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={90} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {([
                    ['Date/Time', <>
                      <Typography variant="body2" gutterBottom>The exact date and time (in your browser's local timezone) when the action was recorded by the server. Entries are listed newest-first.</Typography>
                      <Typography variant="body2">If you are investigating an incident, compare the timestamp with your own activity timeline to determine exactly what changed and when. Precision here matters for security reviews.</Typography>
                    </>],
                    ['User', <>
                      <Typography variant="body2" gutterBottom>The username of the account that performed the action. This is the account that was authenticated when the request was made.</Typography>
                      <Typography variant="body2">System-generated actions (such as scheduled token refreshes) may show as <code>system</code>. If you see an action attributed to a user you don't recognise, investigate immediately — it could indicate a compromised account.</Typography>
                    </>],
                    ['Action', <>
                      <Typography variant="body2" gutterBottom>The type of operation that was performed. Possible values:</Typography>
                      <Box component="ul" sx={{ mt: 0, mb: 0.5, pl: 2.5 }}>
                        {[
                          ['Created (green)', 'A new object was added to the system.'],
                          ['Updated (yellow)', 'An existing object was modified.'],
                          ['Deleted (red)', 'An object was permanently removed.'],
                          ['Generated key (grey)', 'An MCP API key was created for a project.'],
                          ['Revoked key (red)', 'An MCP API key was deleted, revoking all client access.'],
                          ['Login (grey)', 'A user successfully signed in.'],
                        ].map(([a, d]) => <Box component="li" key={a}><Typography variant="body2"><strong>{a}</strong> — {d}</Typography></Box>)}
                      </Box>
                    </>],
                    ['Entity', <>
                      <Typography variant="body2" gutterBottom>The <em>type</em> of object that was affected by the action. Possible values: <strong>Project</strong>, <strong>Tool</strong>, <strong>User</strong>, <strong>Settings</strong>, <strong>API Key</strong>.</Typography>
                      <Typography variant="body2">Combined with the Action column, this tells you exactly what kind of change occurred — for example, Action = "Deleted" + Entity = "Tool" means a tool was permanently removed from a project.</Typography>
                    </>],
                    ['Item', <>
                      <Typography variant="body2" gutterBottom>The name or unique identifier of the <em>specific</em> object that was changed. For example, if a project named "Stripe API" was deleted, the Entity column shows "Project" and this column shows "Stripe API".</Typography>
                      <Typography variant="body2">When a name is not available (e.g. for low-level API key operations), the internal database ID is shown instead. Use this column to quickly locate which exact record was affected without needing to search the rest of the system.</Typography>
                    </>],
                  ] as [string, React.ReactNode][]).map(([h, content]) => (
                    <TableCell key={h}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {h}
                        <HelpButton title={h}>{content}</HelpButton>
                      </Box>
                    </TableCell>
                  ))}

                  {/* IP column header with toggle */}
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {showIp && 'IP'}
                      <Tooltip title={showIp ? 'Hide IP column' : 'Show IP column'}>
                        <IconButton size="small" onClick={() => setShowIp((v) => !v)} sx={{ p: 0.25 }}>
                          <Badge
                            variant="dot"
                            color="primary"
                            invisible={showIp}
                          >
                            {showIp ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={showIp ? 6 : 6}><Typography color="text.secondary" fontSize="0.85rem" py={2} textAlign="center">No logs found.</Typography></TableCell></TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography fontSize="0.78rem" color="text.secondary" whiteSpace="nowrap">
                        {new Date(log.createdAt).toLocaleString('en-US')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize="0.875rem" fontWeight={500}>{log.username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ACTION_LABELS[log.action] ?? log.action}
                        size="small"
                        color={ACTION_COLORS[log.action] ?? 'default'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontSize="0.82rem">{ENTITY_LABELS[log.entity] ?? log.entity}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize="0.82rem" color="text.secondary">
                        {log.entityName || log.entityId || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {showIp
                        ? <Typography fontSize="0.72rem" color="text.disabled">{log.ip || '—'}</Typography>
                        : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {total === 0 ? 'No entries' : `${skip + 1}–${Math.min(skip + LIMIT, total)} of ${total}`}
            </Typography>
            {pageCount > 1 && (
              <Pagination
                count={pageCount}
                page={currentPage}
                onChange={handlePageChange}
                size="small"
                color="primary"
              />
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
