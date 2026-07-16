import { useState } from 'react'
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLock,
  IconTrash,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { Permission, useAuth } from '../../../context/auth'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { Secret } from '../types'
import type { SecretCardProps } from './secretCardProps.interface'


export function SecretCard({ secret, onEdit, onDelete, onCopy, copied }: SecretCardProps) {
  const { t } = useTranslation('secrets')
  const [revealed, setRevealed] = useState(false)
  const [value, setValue] = useState<string | null>(null)
  const [loadingValue, setLoadingValue] = useState(false)
  const { can } = useAuth()

  const canEdit = can(Permission.SecretsEdit)
  const canReveal = can(Permission.SecretsRevealValues)

  const loadValue = async () => {
    if (value !== null || loadingValue || !canReveal) return value
    setLoadingValue(true)
    try {
      const { data } = await api.get<{ value: string }>(`/secrets/${secret.id}/value`)
      setValue(data.value)
      return data.value
    } finally {
      setLoadingValue(false)
    }
  }

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false)
      return
    }
    await loadValue()
    setRevealed(true)
  }

  const actions: BaseListCardAction[] = []
  if (canReveal) {
    actions.push({
      icon: <IconCopy size={15} />,
      tooltip: copied ? t('common:action.copied') : t('action.copyValue'),
      onClick: () => onCopy(secret),
      color: copied ? 'success' : 'default',
    })
  }
  if (can(Permission.SecretsDelete)) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('common:action.delete'),
      onClick: () => onDelete(secret),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<Box sx={{ color: 'warning.main' }}><IconLock size={16} /></Box>}
      title={secret.name}
      description={secret.description}
      onClick={canEdit ? () => onEdit(secret) : undefined}
      disabled={!canEdit}
      content={
        <Box>
          <Box display="flex" alignItems="center" gap={0.5} mb={1}>
            <Typography
              variant="caption"
              fontFamily="monospace"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
            >
              {revealed ? (value ?? t('common:action.loading')) : '••••••••••••'}
            </Typography>
            {canReveal && (
              <Tooltip title={revealed ? t('action.hide') : t('action.reveal')}>
                <IconButton size="small" onClick={handleReveal} disabled={loadingValue} sx={{ p: 0.25, flexShrink: 0 }}>
                  {revealed ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: '4px', px: 1, py: 0.25, display: 'inline-block', maxWidth: '100%' }}>
            <Typography variant="caption" fontFamily="monospace" color="text.secondary" fontSize="0.68rem" sx={{ overflowWrap: 'anywhere' }}>
              {`{{secret:${secret.name}}}`}
            </Typography>
          </Box>
        </Box>
      }
      footer={
        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          {secret.updatedAt && t('label.updated', { date: new Date(secret.updatedAt).toLocaleDateString() })}
        </Typography>
      }
      actions={actions}
    />
  )
}