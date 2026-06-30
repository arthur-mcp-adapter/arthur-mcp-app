import { Box, Chip, Typography } from '@mui/material'
import { IconRobot, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Permission, useAuth } from '../../../context/AuthContext'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { AiProvider } from '../types'

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d97559',
  google: '#1a73e8',
  gemini: '#1a73e8',
  mistral: '#ff6b35',
  groq: '#f55036',
  cohere: '#39594d',
  'azure-openai': '#0078d4',
  azure: '#0078d4',
  ollama: '#111827',
  custom: '#7c3aed',
}

export function AiProviderCard({ provider, onEdit, onDelete }: {
  provider: AiProvider
  onEdit: (provider: AiProvider) => void
  onDelete: (provider: AiProvider) => void
}) {
  const { t } = useTranslation(['aiProviders', 'common'])
  const { can } = useAuth()

  const color = PROVIDER_COLORS[provider.provider] ?? '#7c3aed'

  const actions: BaseListCardAction[] = []
  if (can(Permission.AiProvidersDelete)) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('common:action.delete'),
      onClick: () => onDelete(provider),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<Box sx={{ color }}><IconRobot size={16} /></Box>}
      title={provider.name}
      description={provider.description}
      onClick={can(Permission.AiProvidersEdit) ? () => onEdit(provider) : undefined}
      disabled={!can(Permission.AiProvidersEdit)}
      content={
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
          <Chip
            label={t(`provider.${provider.provider}`)}
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
          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
            {provider.model}
          </Typography>
          {provider.isDefault && (
            <Chip
              label={t('label.default')}
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
          {provider.lastTestStatus && (
            <Chip
              label={t(`status.${provider.lastTestStatus}`)}
              size="small"
              color={provider.lastTestStatus === 'success' ? 'success' : 'error'}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
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
