import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBug,
  IconCheck,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import type { ErrorTrackingProviderRecord } from './errorTrackingProviderRecord.interface'
import type { ErrorTrackingProviderForm } from './errorTrackingProviderForm.interface'
import { SENTRY_COLOR } from './constants/sentryColor.constant'



export default function NewErrorTrackingProvider() {
  const navigate = useNavigate()
  const { t } = useTranslation(['errorTracking', 'common'])
  const { can, loading: authLoading } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDsn, setShowDsn] = useState(false)
  const [form, setForm] = useState<ErrorTrackingProviderForm>({
    name: '',
    description: '',
    dsn: '',
    projectName: '',
    environment: '',
  })

  const steps = [
    t('errorTracking:create.steps.details'),
    t('errorTracking:create.steps.connection'),
  ]

  const setField = <K extends keyof ErrorTrackingProviderForm>(key: K, value: ErrorTrackingProviderForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const canNext =
    activeStep === 0
      ? form.name.trim().length > 0
      : form.dsn.trim().length > 0

  const handleNext = () => {
    if (!canNext) {
      setError(activeStep === 0 ? t('errorTracking:error.nameRequired') : t('errorTracking:error.dsnRequired'))
      return
    }
    setError('')
    setActiveStep((s) => s + 1)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t('errorTracking:error.nameRequired')); return }
    if (!form.dsn.trim()) { setError(t('errorTracking:error.dsnRequired')); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post<ErrorTrackingProviderRecord>('/error-tracking-providers', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        tool: 'sentry',
        dsn: form.dsn.trim(),
        projectName: form.projectName.trim() || undefined,
        environment: form.environment.trim() || undefined,
      })
      navigate(`/error-tracking/${data.id}`)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
        : undefined
      setError(msg ?? t('errorTracking:error.saveFailed'))
      setSaving(false)
    }
  }

  if (!authLoading && !can(Permission.ErrorTrackingCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('common:error.forbidden')}</Typography>
      </Box>
    )
  }

  return (
    <Box maxWidth={640} mx="auto">
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button
          size="small"
          startIcon={<IconArrowLeft size={16} />}
          onClick={() => navigate('/error-tracking')}
          sx={{ mr: 0.5 }}
        >
          {t('errorTracking:heading.title')}
        </Button>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 28, height: 28, borderRadius: '6px',
              bgcolor: `${SENTRY_COLOR}18`, border: `1px solid ${SENTRY_COLOR}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SENTRY_COLOR, flexShrink: 0,
            }}
          >
            <IconBug size={15} />
          </Box>
          <Typography variant="h5" fontWeight={700}>{t('errorTracking:create.title')}</Typography>
        </Box>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={activeStep > index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Step 0 — Details */}
      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('errorTracking:create.detailsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('errorTracking:create.detailsHint')}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth required
                label={t('errorTracking:label.name')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('errorTracking:placeholder.name')}
                onKeyDown={(e) => { if (e.key === 'Enter' && canNext) handleNext() }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth multiline minRows={3}
                label={t('errorTracking:label.description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('errorTracking:placeholder.description')}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 1 — Connection */}
      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('errorTracking:create.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('errorTracking:create.connectionHint')}</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth required
                label={t('errorTracking:label.dsn')}
                type={showDsn ? 'text' : 'password'}
                value={form.dsn}
                onChange={(e) => setField('dsn', e.target.value)}
                placeholder={t('errorTracking:placeholder.dsn')}
                helperText={t('errorTracking:hint.dsnRequired')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showDsn ? t('common:action.hide') : t('common:action.show')}>
                        <IconButton size="small" onClick={() => setShowDsn((v) => !v)} edge="end">
                          {showDsn ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small" fullWidth
                label={t('errorTracking:label.projectName')}
                value={form.projectName}
                onChange={(e) => setField('projectName', e.target.value)}
                placeholder={t('errorTracking:placeholder.projectName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small" fullWidth
                label={t('errorTracking:label.environment')}
                value={form.environment}
                onChange={(e) => setField('environment', e.target.value)}
                placeholder={t('errorTracking:placeholder.environment')}
                helperText={t('errorTracking:hint.environmentOptional')}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button disabled={activeStep === 0 || saving} onClick={() => setActiveStep((s) => s - 1)}>
          {t('common:action.back')}
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" endIcon={<IconArrowRight size={16} />} disabled={!canNext} onClick={handleNext}>
            {t('common:action.next')}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconCheck size={16} />}
            disabled={saving || !canNext}
            onClick={handleCreate}
          >
            {saving ? t('common:action.saving') : t('errorTracking:action.createProvider')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
