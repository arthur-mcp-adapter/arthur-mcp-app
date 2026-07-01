import { ReactNode } from 'react'
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'

export interface BaseListCardAction {
  icon: ReactNode
  tooltip: string
  onClick: (e: React.MouseEvent) => void
  color?: 'default' | 'success' | 'error' | 'inherit'
  disabled?: boolean
}

export interface BaseListCardProps {
  icon: ReactNode
  title: string
  description?: string
  content?: ReactNode // e.g., tags, status chips, revealed secret, etc.
  footer?: ReactNode // e.g., metadata line, updated date
  actions: BaseListCardAction[]
  onClick?: () => void
  disabled?: boolean
  opacity?: number // 0-1, for disabled/paused state
}

/**
 * Reusable card component for list views (Prompts, Secrets, Servers).
 * Handles consistent layout, hover effects, and action button patterns.
 */
export function BaseListCard({
  icon,
  title,
  description,
  content,
  footer,
  actions,
  onClick,
  disabled,
  opacity = 1,
}: BaseListCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={disabled ? undefined : onClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'border-color 0.15s',
        cursor: disabled ? 'default' : (onClick ? 'pointer' : 'default'),
        opacity,
        '&:hover': {
          borderColor: disabled ? 'divider' : 'primary.main',
          '& .card-actions': { opacity: 1 },
        },
      }}
    >
      {/* Action buttons - appear on hover */}
      <Box
        className="card-actions"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          display: 'flex',
          gap: 0.25,
          opacity: 0,
          transition: 'opacity 0.15s',
        }}
      >
        {actions.map((action, idx) => (
          <Tooltip key={idx} title={action.tooltip}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick(e)
              }}
              disabled={action.disabled}
              color={action.color}
              sx={{
                p: 0.5,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                  ...(action.color === 'error' && { color: 'error.main' }),
                },
                ...(action.color === 'error' && { color: 'text.disabled' }),
              }}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* Content area */}
      <Box sx={{ flexGrow: 1, p: 2, pr: 5 }}>
        {/* Header: icon + title */}
        <Box display="flex" alignItems="center" gap={1} mb={0.5} minWidth={0}>
          <Box sx={{ flexShrink: 0 }}>{icon}</Box>
          <Typography fontWeight={700} fontSize="0.9375rem" noWrap lineHeight={1.3}>
            {title}
          </Typography>
        </Box>

        {/* Description */}
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            mb={1}
            sx={{
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        )}

        {/* Custom content area (tags, status, revealed value, etc.) */}
        {content && <Box mb={1}>{content}</Box>}

        {/* Footer metadata */}
        {footer && footer}
      </Box>
    </Paper>
  )
}
