import { useRef, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Paper, TextField, Typography,
} from '@mui/material'
import {
  IconCloudUpload, IconFile, IconRefresh, IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { BaseDialogLayout } from '../../../../components'

export function ReimportSpecDialog({ projectId, open, onClose, onSuccess }: {
  projectId: string
  open: boolean
  onClose: () => void
  onSuccess: (result: { added: number; updated: number; baseUrl: string }) => void
}) {
  const { t } = useTranslation('serverDetail')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setFile(null); setBaseUrl(''); setError('') }

  const handleClose = () => { reset(); onClose() }

  const acceptFile = (f: File) => {
    const n = f.name.toLowerCase()
    if (!n.endsWith('.yaml') && !n.endsWith('.yml') && !n.endsWith('.json')) {
      setError(t('error.specFormat'))
      return
    }
    setFile(f)
    setError('')
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
      const { data } = await api.post<{ added: number; updated: number; baseUrl: string }>(
        `/swagger/servers/${projectId}/reimport`, form,
        { params, headers: { 'Content-Type': 'multipart/form-data' } },
      )
      reset()
      onSuccess(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('error.requestFailed')
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally { setLoading(false) }
  }

  return (
    <BaseDialogLayout
      open={open}
      onClose={handleClose}
      title={t('reimport.title')}
      width={480}
      titleIcon={<IconRefresh size={18} />}
      description={(
        <>
          {t('reimport.description')}
        </>
      )}
      footer={(
        <>
          <Button onClick={handleClose}>{t('common:action.cancel')}</Button>
          <Button variant="contained" onClick={handleImport} disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={18} />}>
            {loading ? t('action.importing') : t('action.import')}
          </Button>
        </>
      )}
    >
      <Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper variant="outlined"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }}
          onClick={() => !file && fileInputRef.current?.click()}
          sx={{
            p: 3, textAlign: 'center', cursor: file ? 'default' : 'pointer',
            border: '2px dashed',
            borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
            bgcolor: dragging ? 'primary.light' : file ? 'rgba(73,204,144,0.08)' : 'background.paper',
            transition: 'all 0.15s', mb: 2,
            '&:hover': file ? {} : { bgcolor: 'action.hover', borderColor: 'primary.light' },
          }}
        >
          <input ref={fileInputRef} type="file" accept=".yaml,.yml,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = '' }} />
          {file ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <IconFile size={36} style={{ color: '#13DEB9' }} />
              <Typography fontWeight={700} color="success.main">{file.name}</Typography>
              <Button size="small" startIcon={<IconX size={18} />}
                onClick={(e) => { e.stopPropagation(); setFile(null) }}>
                {t('common:action.remove')}
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <IconCloudUpload size={36} style={{ opacity: 0.5 }} />
              <Typography variant="body2" fontWeight={500}>{t('placeholder.dragOrBrowse')}</Typography>
              <Typography variant="caption" color="text.disabled">{t('label.specFormat')}</Typography>
            </Box>
          )}
        </Paper>

        <TextField size="small" fullWidth label={t('reimport.baseUrlLabel')} placeholder="https://api.example.com"
          value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
          helperText={t('hint.baseUrlOverride')} />
      </Box>
    </BaseDialogLayout>
  )
}
