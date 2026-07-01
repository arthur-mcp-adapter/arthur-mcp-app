import { Box, Chip, Typography } from '@mui/material'
import { IconBug, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Permission, useAuth } from '../../../context/AuthContext'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { ErrorTrackingProvider } from '../types'

export const TOOL_COLORS: Record<string, string> = {
  sentry: '#362d59',
  rollbar: '#ff6600',
  bugsnag: '#4949e7',
  datadog_apm: '#632ca6',
  newrelic_apm: '#00ac69',
  custom: '#6b7280',
}

export function ErrorTrackingProviderCard({ provider, onEdit, onDelete }: {
  provider: ErrorTrackingProvider
  onEdit: (provider: ErrorTrackingProvider) => void
  onDelete: (provider: ErrorTrackingProvider) => void
}) {
  const { t } = useTranslation('errorTracking')
  const { can } = useAuth()

  const sentryColor = TOOL_COLORS['sentry'] ?? '#362d59'

  const actions: BaseListCardAction[] = []
  if (can(Permission.ErrorTrackingDelete)) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('common:action.delete'),
      onClick: () => onDelete(provider),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<Box sx={{ color: sentryColor }}><IconBug size={16} /></Box>}
      title={provider.name}
      description={provider.description}
      onClick={can(Permission.ErrorTrackingEdit) ? () => onEdit(provider) : undefined}
      disabled={!can(Permission.ErrorTrackingEdit)}
      content={
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
          <Chip
            label="Sentry"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: `${sentryColor}18`,
              color: sentryColor,
              border: `1px solid ${sentryColor}40`,
            }}
          />
          {provider.environment && (
            <Chip
              label={provider.environment}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem', fontFamily: 'monospace' }}
            />
          )}
          {provider.projectName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {provider.projectName}
            </Typography>
          )}
          {provider.isActive && (
            <Chip
              label="Active"
              size="small"
              color="success"
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
            />
          )}
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
