import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/auth'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import api from '../../api'
import { HelpButton } from '../../components'
import type { Phase } from './phase.type'
import type { UploadResult } from './uploadResult.interface'


export default function Upload() {
  const { t } = useTranslation('servers')
  const { can, loading: authLoading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const accept = (f: File) => {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.yaml') && !name.endsWith('.yml') && !name.endsWith('.json')) {
      setErrorMsg(t('upload.invalidFile'))
      setPhase('error')
      return
    }
    setFile(f)
    setPhase('idle')
    setErrorMsg('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setPhase('uploading')
    setErrorMsg('')
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const params = baseUrl ? { baseUrl } : {}
      const { data } = await api.post<UploadResult>('/swagger/upload', form, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setPhase('success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('upload.processError')
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg)
      setPhase('error')
    }
  }

  if (!authLoading && !can(Permission.ServersCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('error.accessRestricted')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('error.forbiddenCreate')}</Typography>
      </Box>
    )
  }

  return (
    <Box p={{ xs: 2, sm: 3 }} maxWidth={640} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h5" fontWeight="bold">{t('upload.pageTitle')}</Typography>
        <HelpButton title={t('upload.pageTitle')}>
          <Typography variant="body2" gutterBottom>
            {t('upload.help.intro')}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>{t('upload.help.howToUseTitle')}</strong>
          </Typography>
          <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">{t('upload.help.howToUseStep1Prefix')} <strong>{t('upload.help.howToUseStep1OpenApi')}</strong> {t('upload.help.howToUseStep1And')} <strong>{t('upload.help.howToUseStep1Swagger')}</strong> {t('upload.help.howToUseStep1Suffix')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.howToUseStep2Prefix')} <strong>{t('upload.help.howToUseStep2Strong')}</strong>. {t('upload.help.howToUseStep2Suffix')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.howToUseStep3Prefix')} <strong>{t('upload.upload')}</strong>. {t('upload.help.howToUseStep3Suffix')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.howToUseStep4Prefix')} <strong>{t('upload.viewServer')}</strong> {t('upload.help.howToUseStep4Suffix')}</Typography></Box>
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>{t('upload.help.generatedTitle')}</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">{t('upload.help.generatedItem1Prefix')} <code>info.title</code>.</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.generatedItem2Prefix')} <code>operationId</code> {t('upload.help.generatedItem2Suffix')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.generatedItem3Prefix')} <code>summary</code> {t('upload.help.generatedItem3And')} <code>description</code> {t('upload.help.generatedItem3Suffix')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.generatedItem4')}</Typography></Box>
          </Box>
          <Typography variant="body2">
            <strong>{t('upload.help.tipStrong')}</strong> {t('upload.help.tipBody')}
          </Typography>
          <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
            <strong>{t('upload.help.successTitle')}</strong>
          </Typography>
          <Typography variant="body2" gutterBottom>{t('upload.help.successBody')}</Typography>
          <Typography variant="body2" gutterBottom>
            <strong>{t('upload.help.troubleshootingTitle')}</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">{t('upload.help.troubleshootingFormat')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.troubleshootingUrl')}</Typography></Box>
            <Box component="li"><Typography variant="body2">{t('upload.help.troubleshootingDescriptions')}</Typography></Box>
          </Box>
        </HelpButton>
      </Box>

      {/* Drop zone */}
      <Paper
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          p: { xs: 3, sm: 6 },
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".yaml,.yml,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) accept(f)
            e.target.value = ''
          }}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        {file ? (
          <Typography fontWeight="bold">{file.name}</Typography>
        ) : (
          <>
            <Typography>{t('upload.dragHint')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('upload.clickHint')}
            </Typography>
          </>
        )}
      </Paper>

      {/* Optional base URL */}
      <TextField
        label={t('upload.baseUrlLabel')}
        placeholder={t('upload.baseUrlPlaceholder')}
        fullWidth
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        sx={{ mt: 2 }}
        helperText={t('upload.baseUrlHelper')}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!file || phase === 'uploading'}
        onClick={handleSubmit}
        startIcon={phase === 'uploading' ? <CircularProgress size={18} color="inherit" /> : undefined}
      >
        {phase === 'uploading' ? t('upload.processing') : t('upload.upload')}
      </Button>

      {phase === 'error' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {phase === 'success' && result && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate(`/servers/${result._id}`)}
            >
              {t('upload.viewServer')}
            </Button>
          }
        >
          <strong>{result.name}</strong> {t('upload.importedSuccess')} —{' '}
          {t('label.toolsGenerated', { count: result.tools.length })}
        </Alert>
      )}
    </Box>
  )
}
