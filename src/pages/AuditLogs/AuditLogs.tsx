import { useEffect, useState } from 'react'
import { useAuth, Permission } from '../../context/auth'
import {
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
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { HelpButton } from '../../components'
import type { AuditEntry } from './auditEntry.interface'
import { ACTION_COLORS } from './constants/actionColors.constant'
import { LIMIT } from './constants/limit.constant'



export default function AuditLogs() {
  const { can, loading: authLoading } = useAuth()
  const { t } = useTranslation('audit')
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
      .catch((err) => {
        if (err?.response?.status === 403) setError('forbidden')
        else setError(t('loadError'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (authLoading) return
    if (!can(Permission.AuditView)) { setLoading(false); return }
    load()
  }, [authLoading])

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    load((page - 1) * LIMIT)
  }

  const paginationLabel = total === 0
    ? t('noEntries')
    : t('pagination', { from: skip + 1, to: Math.min(skip + LIMIT, total), total })

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.2px">{t('title')}</Typography>
          <HelpButton title={t('help.title')}>
            <Typography variant="body2" gutterBottom>
              {t('help.intro')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              {t('help.body')}
            </Typography>
            <Typography variant="body2" gutterBottom>{t('help.howToUse')}</Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>{t('help.tipInvestigate')}</strong></Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.tipWho')}</strong></Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.tipSecurity')}</strong></Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.tipCompliance')}</strong></Typography></Box>
            </Box>
            <Typography variant="body2">
              {t('help.retention')}
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mt: 1 }}><strong>{t('help.successTitle')}</strong></Typography>
            <Typography variant="body2" gutterBottom>{t('help.successBody')}</Typography>
            <Typography variant="body2" gutterBottom><strong>{t('help.troubleshootingTitle')}</strong></Typography>
            <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">{t('help.troubleshootingMissing')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.troubleshootingAccess')}</Typography></Box>
              <Box component="li"><Typography variant="body2">{t('help.troubleshootingIp')}</Typography></Box>
            </Box>
          </HelpButton>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {total > 0 && (
            <Chip label={t('entries', { count: total })} size="small" sx={{ height: 22, fontSize: '0.72rem' }} />
          )}
          <Button size="small" variant="outlined" startIcon={<IconRefresh size={18} />} onClick={() => load(skip)}>
            {t('refresh')}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={70} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={90} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      ) : error === 'forbidden' || !can(Permission.AuditView) ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
          <Typography color="text.secondary" variant="h6">{t('accessRestricted')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('accessRestrictedMsg')}</Typography>
        </Box>
      ) : error ? (
        <Box py={8} textAlign="center" display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography color="text.secondary">{t('loadFailed')}</Typography>
          <Button size="small" variant="outlined" onClick={() => load(skip)}>{t('retry')}</Button>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
            <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {([
                    [t('columns.dateTime'), <>
                      <Typography variant="body2" gutterBottom>{t('help.dateTimeHelp')}</Typography>
                      <Typography variant="body2">{t('help.dateTimeDetail')}</Typography>
                    </>],
                    [t('columns.user'), <>
                      <Typography variant="body2" gutterBottom>{t('help.userHelp')}</Typography>
                      <Typography variant="body2">{t('help.userDetail')}</Typography>
                    </>],
                    [t('columns.action'), <>
                      <Typography variant="body2" gutterBottom>{t('help.actionHelp')}</Typography>
                      <Box component="ul" sx={{ mt: 0, mb: 0.5, pl: 2.5 }}>
                        {[
                          t('help.actionCreated'),
                          t('help.actionUpdated'),
                          t('help.actionDeleted'),
                          t('help.actionGeneratedKey'),
                          t('help.actionRevokedKey'),
                          t('help.actionLogin'),
                        ].map((label) => (
                          <Box component="li" key={label}>
                            <Typography variant="body2">{label}</Typography>
                          </Box>
                        ))}
                      </Box>
                      <Typography variant="body2">{t('help.actionDetail')}</Typography>
                    </>],
                    [t('columns.entity'), <>
                      <Typography variant="body2" gutterBottom>{t('help.entityHelp')}</Typography>
                      <Typography variant="body2">{t('help.entityDetail')}</Typography>
                    </>],
                    [t('columns.item'), <>
                      <Typography variant="body2" gutterBottom>{t('help.itemHelp')}</Typography>
                      <Typography variant="body2">{t('help.itemDetail')}</Typography>
                    </>],
                  ] as [string, React.ReactNode][]).map(([h, content], idx) => (
                    <TableCell
                      key={h}
                      sx={(idx === 1 || idx === 3) ? { display: { xs: 'none', md: 'table-cell' } } : undefined}
                    >
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {h}
                        <HelpButton title={h}>{content}</HelpButton>
                      </Box>
                    </TableCell>
                  ))}

                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {showIp && 'IP'}
                      <Tooltip title={showIp ? t('columns.hideIp') : t('columns.showIp')}>
                        <IconButton size="small" onClick={() => setShowIp((v) => !v)} sx={{ p: 0.25 }}>
                          <Badge variant="dot" color="primary" invisible={showIp}>
                            {showIp ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography fontSize="0.78rem" color="text.secondary" whiteSpace="nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography fontSize="0.875rem" fontWeight={500}>{log.username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`actions.${log.action}`, { defaultValue: log.action })}
                        size="small"
                        color={ACTION_COLORS[log.action] ?? 'default'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography fontSize="0.82rem">
                        {t(`entities.${log.entity}`, { defaultValue: log.entity })}
                      </Typography>
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
            </Box>
          </Paper>

          {logs.length === 0 && (
            <Box py={6} textAlign="center">
              <Typography color="text.secondary" variant="body2">{t('noLogs')}</Typography>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {paginationLabel}
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
