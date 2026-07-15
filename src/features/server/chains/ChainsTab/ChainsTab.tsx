import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, Chip, IconButton, Paper, Tooltip, Typography,
} from '@mui/material'
import { IconArrowsShuffle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { ConfirmDialog } from '../../../../components'
import type { GeneratedTool, ToolChain } from '../../types'
import { ChainDialog } from '../ChainDialog'
import type { ChainsTabProps } from './chainsTabProps.interface'


export function ChainsTab({ projectId, initialChains, tools, onChange }: ChainsTabProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const { can } = useAuth()
  const [chains, setChains] = useState<ToolChain[]>(initialChains)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ToolChain | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ToolChain | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = (c: ToolChain) => { setEditTarget(c); setDialogOpen(true) }

  const handleSaved = async (chain: ToolChain) => {
    try {
      if (editTarget) {
        const { data } = await api.patch<ToolChain>(`/swagger/servers/${projectId}/chains/${editTarget.id}`, chain)
        const updated = chains.map((c) => c.id === editTarget.id ? data : c)
        setChains(updated); onChange(updated)
      } else {
        const { data } = await api.post<ToolChain>(`/swagger/servers/${projectId}/chains`, chain)
        const updated = [data, ...chains]
        setChains(updated); onChange(updated)
      }
      setDialogOpen(false)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? t('error.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/swagger/servers/${projectId}/chains/${deleteTarget.id}`)
      const updated = chains.filter((c) => c.id !== deleteTarget.id)
      setChains(updated); onChange(updated)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.25}>{t('heading.toolChains')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('hint.chainDesc')}
          </Typography>
        </Box>
        {can(Permission.ToolsCreate) && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={openCreate}
            disabled={tools.length === 0}>
            {t('action.newChain')}
          </Button>
        )}
      </Box>

      {tools.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('empty.noTablesWarning')}
        </Alert>
      )}

      {chains.length === 0 ? (
        <Alert severity="info">
          {t('empty.noChains')}
        </Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {chains.map((chain) => (
            <Paper key={chain.id} variant="outlined" sx={{
              p: 2,
              '&:hover': { borderColor: 'primary.main' },
              transition: 'border-color 0.15s',
            }}>
              <Box display="flex" alignItems="flex-start" gap={1.5}>
                <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>
                  <IconArrowsShuffle size={18} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                    <Typography fontWeight={700} noWrap>{chain.name}</Typography>
                    {chain.enabled === false && <Chip label={t('label.disabled')} size="small" color="default" sx={{ fontSize: '0.68rem', height: 18 }} />}
                    <Chip label={t('label.stepCount', { count: chain.steps.length })} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                  </Box>
                  {chain.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>{chain.description}</Typography>
                  )}
                  <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                    {chain.steps.map((s, i) => (
                      <Typography key={s.id} variant="caption" fontFamily="monospace" color="text.secondary">
                        {i > 0 && '→ '}{s.toolName}
                      </Typography>
                    ))}
                  </Box>
                </Box>
                <Box display="flex" gap={0.25} flexShrink={0}>
                  {can(Permission.ToolsEdit) && (
                    <Tooltip title={t('common:action.edit')}>
                      <IconButton size="small" onClick={() => openEdit(chain)}>
                        <IconEdit size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {can(Permission.ToolsDelete) && (
                    <Tooltip title={t('common:action.delete')}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(chain)}>
                        <IconTrash size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <ChainDialog
        open={dialogOpen}
        editTarget={editTarget}
        tools={tools}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('confirm.deleteChain', { name: deleteTarget?.name ?? '' })}
        message={t('confirm.deleteChainMessage')}
        confirmLabel={t('common:action.delete')}
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
