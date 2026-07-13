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
  IconCheck,
  IconEye,
  IconEyeOff,
  IconKey,
} from '@tabler/icons-react'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import type { SecretRecord } from './secretRecord.interface'
import type { SecretForm } from './secretForm.interface'


export default function NewSecret() {
  const navigate = useNavigate()
  const { t } = useTranslation(['secrets', 'common'])
  const { can, loading: authLoading } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [form, setForm] = useState<SecretForm>({ name: '', value: '', description: '' })

  const steps = [
    t('secrets:create.steps.details'),
    t('secrets:create.steps.value'),
    t('secrets:create.steps.review'),
  ]

  const setField = <K extends keyof SecretForm>(key: K, value: SecretForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const canNext = activeStep === 0
    ? form.name.trim().length > 0
    : activeStep === 1
      ? form.value.trim().length > 0
      : true

  const handleNext = () => {
    if (!canNext) {
      setError(activeStep === 0 ? t('secrets:error.nameRequired') : t('secrets:error.valueRequired'))
      return
    }
    setError('')
    setActiveStep((step) => step + 1)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t('secrets:error.nameRequired')); return }
    if (!form.value.trim()) { setError(t('secrets:error.valueRequired')); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post<SecretRecord>('/secrets', {
        name: form.name.trim(),
        value: form.value,
        description: form.description.trim() || undefined,
      })
      navigate(`/secrets/${data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('secrets:error.saveFailed'))
      setSaving(false)
    }
  }

  if (!authLoading && !can(Permission.SecretsCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('common:error.forbidden')}</Typography>
      </Box>
    )
  }

  return (
    <Box maxWidth={720} mx="auto">
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/secrets')} sx={{ mr: 0.5 }}>
          {t('secrets:heading.title')}
        </Button>
        <Typography variant="h5" fontWeight={700}>{t('secrets:create.title')}</Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={activeStep > index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('secrets:create.detailsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('secrets:create.detailsHint')}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                required
                label={t('secrets:label.name')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('secrets:placeholder.secretName')}
                helperText={t('secrets:hint.referenceUsage')}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><IconKey size={16} /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={4}
                label={t('secrets:label.description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('secrets:placeholder.description')}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('secrets:create.valueTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('secrets:create.valueHint')}</Typography>
          <TextField
            size="small"
            fullWidth
            required
            label={t('secrets:label.value')}
            value={form.value}
            type={showValue ? 'text' : 'password'}
            onChange={(e) => setField('value', e.target.value)}
            placeholder={t('secrets:placeholder.secretValue')}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={t('secrets:action.toggleVisibility')}>
                    <IconButton size="small" onClick={() => setShowValue((value) => !value)} edge="end">
                      {showValue ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      )}

      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('secrets:create.reviewTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('secrets:create.reviewHint')}</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('secrets:label.name')}</Typography>
              <Typography fontWeight={700}>{form.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('secrets:label.referenceKey')}</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{`{{secret:${form.name.trim()}}}`}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('secrets:label.value')}</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{'•'.repeat(Math.min(Math.max(form.value.length, 8), 24))}</Typography>
            </Box>
            {form.description && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('secrets:label.description')}</Typography>
                <Typography variant="body2">{form.description}</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          disabled={activeStep === 0 || saving}
          onClick={() => setActiveStep((step) => step - 1)}
        >
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
            {saving ? t('common:action.saving') : t('secrets:action.createSecret')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
