import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconCopy,
  IconLabel,
  IconTrash,
} from '@tabler/icons-react'
import { Permission, useAuth } from '../../../context/AuthContext'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { HealthEntry, Project } from '../types'

function TrafficLight({ health, isPaused }: { health?: HealthEntry; isPaused?: boolean }) {
  const { t } = useTranslation('servers')

  if (isPaused) {
    return (
      <Tooltip title={t('status.pausedByManager')}>
        <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0, border: '1.5px solid', borderColor: 'text.secondary' }} />
      </Tooltip>
    )
  }

  if (!health || health.totalCalls === 0) {
    return (
      <Tooltip title={t('status.noActivity')}>
        <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'action.disabledBackground', flexShrink: 0, border: '1.5px solid', borderColor: 'action.disabled' }} />
      </Tooltip>
    )
  }

  const color = health.errorRatePct === 0 ? 'success.main' : health.errorRatePct < 20 ? 'warning.main' : 'error.main'
  const border = health.errorRatePct === 0 ? 'success.dark' : health.errorRatePct < 20 ? 'warning.dark' : 'error.dark'
  const label = health.errorRatePct === 0
    ? t('status.requestsSucceeded', { count: health.totalCalls })
    : t('status.errorRate', { rate: health.errorRatePct, count: health.totalCalls })

  return (
    <Tooltip title={label}>
      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color, flexShrink: 0, border: '1.5px solid', borderColor: border }} />
    </Tooltip>
  )
}

export function ProjectCard({ p, health, onDelete, onDuplicate }: {
  p: Project
  health?: HealthEntry
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { t } = useTranslation('servers')

  const actions: BaseListCardAction[] = []
  if (can(Permission.ServersCreate)) {
    actions.push({
      icon: <IconCopy size={15} />,
      tooltip: t('common:action.duplicate'),
      onClick: () => onDuplicate(p._id),
    })
  }
  if (can(Permission.ServersDelete)) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('common:action.delete'),
      onClick: () => onDelete(p._id),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<TrafficLight health={health} isPaused={p.isPaused} />}
      title={p.name}
      description={p.description}
      onClick={() => navigate(`/servers/${p._id}`)}
      opacity={p.isPaused ? 0.8 : 1}
      content={
        <Box>
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            mb={1}
            fontFamily="monospace"
            fontSize="0.72rem"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {p.baseUrl}
          </Typography>

          <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center" mb={1}>
            {p.isPaused
              ? <Chip label={t('status.paused')} size="small" color="default" sx={{ fontWeight: 600 }} />
              : <Chip
                  label={p.status === 'active' ? t('status.active') : t('common:status.error')}
                  size="small"
                  color={p.status === 'active' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
            }
            <Chip
              label={t('label.toolCount', { count: p.tools?.length ?? 0 })}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {p.version && (
              <Chip label={`v${p.version}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
            )}
          </Box>

          {p.tags && p.tags.length > 0 && (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {p.tags.map((tag) => (
                <Chip
                  key={tag}
                  icon={<IconLabel size={10} />}
                  label={tag}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.68rem', height: 18 }}
                />
              ))}
            </Box>
          )}
        </Box>
      }
      actions={actions}
    />
  )
}
