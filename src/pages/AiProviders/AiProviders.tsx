import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { IconPlus, IconRobot, IconSearch } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import { AppSnackbar, ConfirmDialog } from '../../components'
import { AiProviderCard, type AiProvider } from '../../features/aiProviders'
import { useListPageLogic } from '../../hooks'

export default function AiProviders() {
  const { t } = useTranslation(['aiProviders', 'common'])
  const navigate = useNavigate()
  const { can } = useAuth()

  const [state, handlers] = useListPageLogic({
    loadItems: () => api.get<AiProvider[]>('/ai-providers').then((r) => r.data),
    deleteItem: (id) => api.delete(`/ai-providers/${id}`),
    permission: Permission.AiProvidersView,
  })

  const visible = state.search
    ? state.items.filter((p) => {
        const q = state.search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.provider.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      })
    : state.items
  const providerLimitReached = state.items.length >= 1

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700}>{t('heading.title')}</Typography>
          <Tooltip title={<span>{t('heading.subtitle')}</span>}>
            <IconButton size="small" sx={{ color: 'text.disabled' }}>
              <IconRobot size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        {can(Permission.AiProvidersCreate) && (
          <Tooltip title={providerLimitReached ? <span>{t('hint.singleProviderLimit')}</span> : ''}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<IconPlus size={18} />}
                disabled={providerLimitReached}
                onClick={() => navigate('/ai-providers/new')}
              >
                {t('action.newProvider')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {providerLimitReached && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('hint.singleProviderLimit')}
        </Alert>
      )}

      <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <TextField
          size="small"
          placeholder={t('placeholder.searchProviders')}
          value={state.search}
          onChange={(e) => handlers.setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
          }}
        />
        {state.search && (
          <Typography variant="body2" color="text.secondary">
            {visible.length} of {state.items.length}
          </Typography>
        )}
      </Box>

      {state.loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      ) : state.items.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">{t('empty.noProviders')}</Typography>
        </Box>
      ) : visible.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">{t('empty.noMatch')}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {visible.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <AiProviderCard
                provider={p}
                onEdit={(item) => navigate(`/ai-providers/${item.id}`)}
                onDelete={handlers.handleDeleteRequest}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        open={state.deleteTarget !== null}
        title={t('confirm.deleteTitle', { name: state.deleteTarget?.name ?? '' })}
        message={t('confirm.deleteMessage')}
        confirmLabel={t('common:action.delete')}
        confirmColor="error"
        loading={state.deleting}
        onConfirm={handlers.handleDeleteConfirm}
        onClose={handlers.handleDeleteCancel}
      />

      <AppSnackbar
        open={state.snack !== null}
        message={state.snack ? t(`aiProviders:${state.snack.message}`) : ''}
        severity={state.snack?.severity ?? 'success'}
        onClose={() => handlers.setSnack(null)}
      />
    </Box>
  )
}
