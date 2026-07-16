import { useState } from 'react'
import {
  Box, Button, CircularProgress, IconButton, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconChevronDown, IconMessage, IconTrash,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import type { ToolComment } from '../../types'
import type { ToolCommentsSectionProps } from './toolCommentsSectionProps.interface'


export function ToolCommentsSection({ projectId, toolName, initialComments }: ToolCommentsSectionProps) {
  const { can } = useAuth()
  const { t } = useTranslation('serverDetail')
  const [comments, setComments] = useState<ToolComment[]>(initialComments)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post<ToolComment>(
        `/swagger/servers/${projectId}/tools/${encodeURIComponent(toolName)}/comments`,
        { text: text.trim(), author: 'me' },
      )
      setComments((prev) => [...prev, data])
      setText('')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/swagger/servers/${projectId}/tools/${encodeURIComponent(toolName)}/comments/${id}`)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <IconMessage size={15} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {t('notes', { count: comments.length })}
        </Typography>
        <IconChevronDown size={14} className={open ? 'tool-comments-section-chevron tool-comments-section-chevron-open' : 'tool-comments-section-chevron'} />
      </Box>

      {open && (
        <Box mt={1.5} display="flex" flexDirection="column" gap={1}>
          {comments.length === 0 && (
            <Typography variant="caption" color="text.disabled">{t('noNotes')}</Typography>
          )}
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Box flexGrow={1}>
                <Typography fontSize="0.82rem">{c.text}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {c.author} · {new Date(c.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              {can(Permission.ToolsEdit) && (
                <Tooltip title={t('common:action.delete')}>
                  <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                    <IconTrash size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
          {can(Permission.ToolsEdit) && (
            <Box display="flex" gap={1} mt={0.5}>
              <TextField size="small" fullWidth placeholder={t('placeholder.addNote')} value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }} />
              <Button size="small" variant="contained" onClick={handleAdd} disabled={!text.trim() || saving}
                startIcon={saving ? <CircularProgress size={12} color="inherit" /> : undefined}>
                {t('common:action.add')}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
