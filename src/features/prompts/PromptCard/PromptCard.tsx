import {
  Box,
  Chip,
  Typography,
} from '@mui/material'
import {
  IconCopy,
  IconMessage2,
  IconTag,
  IconTrash,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { BaseListCard, type BaseListCardAction } from '../../../components'
import type { Prompt } from '../types'
import type { PromptCardProps } from './promptCardProps.interface'


export function PromptCard({ prompt, onEdit, onCopy, onDelete, canEdit, canDelete, copied }: PromptCardProps) {
  const { t } = useTranslation('prompts')

  const actions: BaseListCardAction[] = []
  actions.push({
    icon: <IconCopy size={15} />,
    tooltip: copied ? t('toast.copied') : t('filter.copyContent'),
    onClick: () => onCopy(prompt),
    color: copied ? 'success' : 'default',
  })
  if (canDelete) {
    actions.push({
      icon: <IconTrash size={15} />,
      tooltip: t('filter.delete'),
      onClick: () => onDelete(prompt),
      color: 'error',
    })
  }

  return (
    <BaseListCard
      icon={<Box sx={{ color: 'primary.main' }}><IconMessage2 size={16} /></Box>}
      title={prompt.name}
      description={prompt.description}
      onClick={canEdit ? () => onEdit(prompt) : undefined}
      disabled={!canEdit}
      content={
        <Box>
          <Box sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1 }}>
            <Typography
              variant="caption"
              fontFamily="monospace"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                fontSize: '0.72rem',
                lineHeight: 1.5,
              }}
            >
              {prompt.content}
            </Typography>
          </Box>

          {prompt.tags.length > 0 && (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {prompt.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  icon={<IconTag size={10} />}
                  sx={{ fontSize: '0.68rem', height: 18, '& .MuiChip-icon': { ml: '4px', mr: '-2px' } }}
                />
              ))}
            </Box>
          )}
        </Box>
      }
      footer={
        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          {prompt.content.length} chars
          {prompt.updatedAt && ` · ${t('label.updatedDate', { date: new Date(prompt.updatedAt).toLocaleDateString() })}`}
        </Typography>
      }
      actions={actions}
    />
  )
}