import { useRef, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Paper, TextField, Typography,
} from '@mui/material'
import {
  IconCloudUpload, IconFile, IconRefresh, IconX,
} from '@tabler/icons-react'
import api from '../../../../api'
import { BaseDialogLayout } from '../../../../components'

export function ReimportSpecDialog({ projectId, open, onClose, onSuccess }: {
  projectId: string
  open: boolean
  onClose: () => void
  onSuccess: (result: { added: number; updated: number; baseUrl: string }) => void
}) {
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
      setError('Unsupported format — use .yaml, .yml or .json')
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
      const msg = err?.response?.data?.message ?? 'Error importing spec.'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally { setLoading(false) }
  }

  return (
    <BaseDialogLayout
      open={open}
      onClose={handleClose}
      title="Re-import API spec"
      width={480}
      titleIcon={<IconRefresh size={18} />}
      description={(
        <>
          Upload a new version of the spec. Tools with the same name will be updated (schema + endpoint);
          new tools will be added. Existing tools not in the new spec are kept — delete them manually if needed.
        </>
      )}
      footer={(
        <>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={18} />}>
            {loading ? 'Importing…' : 'Import'}
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
                Remove
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <IconCloudUpload size={36} style={{ opacity: 0.5 }} />
              <Typography variant="body2" fontWeight={500}>Drag spec here or click to browse</Typography>
              <Typography variant="caption" color="text.disabled">.yaml · .yml · .json</Typography>
            </Box>
          )}
        </Paper>

        <TextField size="small" fullWidth label="Base URL override" placeholder="https://api.example.com"
          value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
          helperText="Leave blank to use the URL declared in the spec" />
      </Box>
    </BaseDialogLayout>
  )
}
