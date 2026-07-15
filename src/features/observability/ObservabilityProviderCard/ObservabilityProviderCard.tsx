import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import { IconActivity, IconExternalLink, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Permission, useAuth } from '../../../context/auth'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { ObservabilityProvider } from '../types'
import type { ObservabilityProviderCardProps } from './observabilityProviderCardProps.interface'
import { PROVIDER_COLORS } from './constants/providerColors.constant'


export function ObservabilityProviderCard({ provider, onEdit, onDelete }: ObservabilityProviderCardProps) {
  const { t } = useTranslation('observability')
  const { can } = useAuth()

  const color = PROVIDER_COLORS[provider.type] ?? '#6b7280'

  const actions: BaseListCardAction[] = []
  if (can(Permission.ObservabilityDelete)) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('common:action.delete'),
      onClick: () => onDelete(provider),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<Box sx={{ color }}><IconActivity size={16} /></Box>}
      title={provider.name}
      description={provider.description}
      onClick={can(Permission.ObservabilityEdit) ? () => onEdit(provider) : undefined}
      disabled={!can(Permission.ObservabilityEdit)}
      content={
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
          <Chip
            label={t(`type.${provider.type}`)}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: `${color}18`,
              color,
              border: `1px solid ${color}40`,
            }}
          />
          <Box
            display="flex" alignItems="center" gap={0.25}
            sx={{ maxWidth: 160, overflow: 'hidden' }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily="monospace"
              noWrap
              title={provider.url}
            >
              {provider.url}
            </Typography>
            <Tooltip title={t('action.openDashboard')}>
              <IconButton
                size="small"
                component="a"
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{ p: 0.25, color: 'text.disabled', flexShrink: 0 }}
              >
                <IconExternalLink size={11} />
              </IconButton>
            </Tooltip>
          </Box>
          {!provider.isActive && (
            <Chip
              label={t('common:label.inactive')}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      }
      footer={
        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          {provider.updatedAt && t('label.updated', { date: new Date(provider.updatedAt).toLocaleDateString() })}
        </Typography>
      }
      actions={actions}
    />
  )
}
