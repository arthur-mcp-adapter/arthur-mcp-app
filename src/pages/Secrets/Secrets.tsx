import { useNavigate } from 'react-router-dom'
import {
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
import {
  IconPlus,
  IconLock,
  IconSearch,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import { AppSnackbar, ConfirmDialog } from '../../components'
import { SecretCard, type Secret } from '../../features/secrets'
import { useListPageLogic } from '../../hooks'
import { useCopyToClipboard } from '../../hooks'

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Secrets() {
  const { t } = useTranslation('secrets')
  const navigate = useNavigate()
  const { can } = useAuth()

  const [state, handlers] = useListPageLogic({
    loadItems: () => api.get<Secret[]>('/secrets').then((r) => r.data),
    deleteItem: (id) => api.delete(`/secrets/${id}`),
    permission: Permission.SecretsViewNames,
  })
  const { copiedId, copyAsync } = useCopyToClipboard({
    onError: (msg) => handlers.setSnack({ message: msg, severity: 'error' }),
  })

  const visible = state.search
    ? state.items.filter((s) => {
        const q = state.search.toLowerCase()
        return s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
      })
    : state.items

  const openCreate = () => navigate('/secrets/new')
  const openEdit = (s: Secret) => navigate(`/secrets/${s.id}`)

  const handleCopy = async (s: Secret) => {
    copyAsync(
      () => api.get<{ value: string }>(`/secrets/${s.id}/value`),
      (res) => res.data.value,
      s.id
    )
  }

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight={700}>{t('heading.title')}</Typography>
          <Tooltip title={<span>{t('heading.subtitle')}</span>}>
            <IconButton size="small" sx={{ color: 'text.disabled' }}>
              <IconLock size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        {can(Permission.SecretsCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
            {t('action.newSecret')}
          </Button>
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <TextField
          size="small" placeholder={t('placeholder.searchSecrets')} value={state.search}
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
          <Typography color="text.secondary" variant="body2">{t('empty.noSecretsSimple')}</Typography>
        </Box>
      ) : visible.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary" variant="body2">{t('empty.noMatch')}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {visible.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <SecretCard
                secret={s}
                onEdit={openEdit}
                onDelete={handlers.handleDeleteRequest}
                onCopy={handleCopy}
                copied={copiedId === s.id}
              />
            </Grid>
          ))}
        </Grid>
      )}
      <ConfirmDialog
        open={state.deleteTarget !== null}
        title={t('confirm.deleteTitle', { name: state.deleteTarget?.name ?? '' })}
        message={t('confirm.deleteMessage')}
        confirmLabel={t('common:action.delete')} confirmColor="error" loading={state.deleting}
        onConfirm={handlers.handleDeleteConfirm}
        onClose={handlers.handleDeleteCancel}
      />

      <AppSnackbar
        open={state.snack !== null}
        message={state.snack?.message ?? ''}
        severity={state.snack?.severity ?? 'success'}
        onClose={() => handlers.setSnack(null)}
      />
    </Box>
  )
}
