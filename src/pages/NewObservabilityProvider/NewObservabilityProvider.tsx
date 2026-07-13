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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconActivity,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import type { ObservabilityProviderType } from '../../features/observability'
import type { ObservabilityProviderRecord } from './observabilityProviderRecord.interface'
import type { ObservabilityProviderForm } from './observabilityProviderForm.interface'
import { PROVIDER_TYPES } from './constants/providerTypes.constant'



export default function NewObservabilityProvider() {
  const navigate = useNavigate()
  const { t } = useTranslation(['observability', 'common'])
  const { can, loading: authLoading } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [form, setForm] = useState<ObservabilityProviderForm>({
    name: '',
    description: '',
    type: 'grafana',
    url: '',
    apiKey: '',
  })

  const steps = [
    t('observability:create.steps.details'),
    t('observability:create.steps.connection'),
    t('observability:create.steps.review'),
  ]

  const setField = <K extends keyof ObservabilityProviderForm>(key: K, value: ObservabilityProviderForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const canNext =
    activeStep === 0
      ? form.name.trim().length > 0
      : activeStep === 1
        ? form.url.trim().length > 0
        : true

  const handleNext = () => {
    if (!canNext) {
      setError(activeStep === 0 ? t('observability:error.nameRequired') : t('observability:error.urlRequired'))
      return
    }
    setError('')
    setActiveStep((s) => s + 1)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t('observability:error.nameRequired')); return }
    if (!form.url.trim()) { setError(t('observability:error.urlRequired')); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post<ObservabilityProviderRecord>('/observability-providers', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        url: form.url.trim(),
        apiKey: form.apiKey.trim() || undefined,
      })
      navigate(`/observability/${data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('observability:error.saveFailed'))
      setSaving(false)
    }
  }

  if (!authLoading && !can(Permission.ObservabilityCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('common:error.forbidden')}</Typography>
      </Box>
    )
  }

  return (
    <Box maxWidth={720} mx="auto">
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button
          size="small"
          startIcon={<IconArrowLeft size={16} />}
          onClick={() => navigate('/observability')}
          sx={{ mr: 0.5 }}
        >
          {t('observability:heading.title')}
        </Button>
        <Typography variant="h5" fontWeight={700}>{t('observability:create.title')}</Typography>
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
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('observability:create.detailsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('observability:create.detailsHint')}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth required
                label={t('observability:label.name')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('observability:placeholder.name')}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><IconActivity size={16} /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth multiline minRows={3}
                label={t('observability:label.description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('observability:placeholder.description')}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
                {t('observability:label.type')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={form.type}
                onChange={(_e, val) => { if (val) setField('type', val) }}
                sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { borderRadius: '6px !important', border: '1px solid !important', borderColor: 'divider !important', '&.Mui-selected': { borderColor: 'primary.main !important' } } }}
              >
                {PROVIDER_TYPES.map((pt) => (
                  <ToggleButton
                    key={pt} value={pt} disableRipple
                    sx={{ px: 1.5, py: 0.75, fontSize: '0.78rem', fontWeight: 500, textTransform: 'none', lineHeight: 1.3, '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(26,115,232,0.08)' } }}
                  >
                    {t(`observability:type.${pt}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 1 — Connection */}
      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('observability:create.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('observability:create.connectionHint')}</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth required
                label={t('observability:label.url')}
                value={form.url}
                onChange={(e) => setField('url', e.target.value)}
                placeholder={t('observability:placeholder.url')}
                helperText={t('observability:hint.urlRequired')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth
                label={t('observability:label.apiKey')}
                type={showApiKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setField('apiKey', e.target.value)}
                placeholder={t('observability:placeholder.apiKey')}
                helperText={form.apiKey ? t('observability:hint.apiKeyProtected') : t('observability:hint.apiKeyOptional')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showApiKey ? t('common:action.hide') : t('common:action.show')}>
                        <IconButton size="small" onClick={() => setShowApiKey((v) => !v)} edge="end">
                          {showApiKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 2 — Review */}
      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('observability:create.reviewTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('observability:create.reviewHint')}</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('observability:label.name')}</Typography>
              <Typography fontWeight={700}>{form.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('observability:label.type')}</Typography>
              <Typography>{t(`observability:type.${form.type}`)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('observability:label.url')}</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{form.url}</Typography>
            </Box>
            {form.apiKey && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('observability:label.apiKey')}</Typography>
                <Typography fontFamily="monospace" fontSize="0.875rem">{'•'.repeat(Math.min(Math.max(form.apiKey.length, 8), 24))}</Typography>
              </Box>
            )}
            {form.description && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('observability:label.description')}</Typography>
                <Typography variant="body2">{form.description}</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          disabled={activeStep === 0 || saving}
          onClick={() => setActiveStep((s) => s - 1)}
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
            {saving ? t('common:action.saving') : t('observability:action.createProvider')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
