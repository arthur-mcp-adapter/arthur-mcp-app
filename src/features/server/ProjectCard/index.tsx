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
import { getProjectIcon } from '../../../utils/sourceType'
import type { Project } from '../types'

export function ProjectCard({ p, onDelete, onDuplicate }: {
  p: Project
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { t } = useTranslation('servers')
  const source = getProjectIcon(p)

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
      icon={
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
      }
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
