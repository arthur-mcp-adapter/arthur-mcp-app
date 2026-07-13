import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconPlayerPlay,
  IconRobot,
} from '@tabler/icons-react'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import type { AiProvider, AiProviderType } from '../../features/aiProviders'
import { SecretAutocomplete, useSecrets } from '../../features/secrets'
import type { AiProviderRecord } from './aiProviderRecord.interface'
import type { AiProviderForm } from './aiProviderForm.interface'
import { PROVIDER_TYPES } from './constants/providerTypes.constant'
import { SUPPORTED_PROVIDERS } from './constants/supportedProviders.constant'
import { MODEL_OPTIONS } from './constants/modelOptions.constant'



export default function NewAiProvider() {
  const navigate = useNavigate()
  const { t } = useTranslation(['aiProviders', 'common'])
  const { can, loading: authLoading } = useAuth()
  const { secrets, loading: loadingSecrets } = useSecrets()
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loadingExistingProvider, setLoadingExistingProvider] = useState(true)
  const [existingProvider, setExistingProvider] = useState<AiProvider | null>(null)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null)
  const [form, setForm] = useState<AiProviderForm>({
    name: '',
    description: '',
    provider: 'openai',
    model: '',
    apiKey: '',
    baseUrl: '',
    isDefault: false,
  })

  const steps = [
    t('aiProviders:create.steps.details'),
    t('aiProviders:create.steps.config'),
    t('aiProviders:create.steps.review'),
  ]

  const setField = <K extends keyof AiProviderForm>(key: K, value: AiProviderForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    if (authLoading) return
    if (!can(Permission.AiProvidersView)) {
      setLoadingExistingProvider(false)
      return
    }

    let active = true
    setLoadingExistingProvider(true)
    api.get<AiProvider[]>('/ai-providers')
      .then((r) => {
        if (active) setExistingProvider(r.data[0] ?? null)
      })
      .catch(() => {
        if (active) setExistingProvider(null)
      })
      .finally(() => {
        if (active) setLoadingExistingProvider(false)
      })

    return () => { active = false }
  }, [authLoading, can])

  const setProvider = (provider: AiProviderType) => {
    setForm((f) => ({
      ...f,
      provider,
      model: MODEL_OPTIONS[provider]?.[0] ?? '',
      apiKey: provider === 'ollama' ? '' : f.apiKey,
    }))
    setTestResult(null)
  }

  const canNext =
    activeStep === 0
      ? form.name.trim().length > 0
      : activeStep === 1
        ? form.model.trim().length > 0 && (form.provider === 'ollama' || form.apiKey.trim().length > 0)
        : true

  const handleTest = async () => {
    if (!canNext) {
      setError(form.model.trim() ? t('aiProviders:error.apiKeyRequired') : t('aiProviders:error.modelRequired'))
      return
    }
    setTesting(true); setError(''); setTestResult(null)
    try {
      const { data } = await api.post<{ ok: boolean; message: string; latencyMs: number }>('/ai-providers/test-config', {
        name: form.name.trim() || t('aiProviders:create.draftName'),
        description: form.description.trim() || undefined,
        provider: form.provider,
        model: form.model.trim(),
        apiKey: form.apiKey,
        baseUrl: form.baseUrl.trim() || undefined,
        isActive: true,
      })
      setTestResult(data)
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.response?.data?.message ?? t('aiProviders:error.testFailed'), latencyMs: 0 })
    } finally {
      setTesting(false)
    }
  }

  const handleNext = () => {
    if (!canNext) {
      if (activeStep === 0) setError(t('aiProviders:error.nameRequired'))
      else if (activeStep === 1) setError(form.model.trim() ? t('aiProviders:error.apiKeyRequired') : t('aiProviders:error.modelRequired'))
      return
    }
    setError('')
    setActiveStep((s) => s + 1)
  }

  const handleCreate = async () => {
    if (existingProvider) { setError(t('aiProviders:error.singleProviderLimit')); return }
    if (!form.name.trim()) { setError(t('aiProviders:error.nameRequired')); return }
    if (!form.model.trim()) { setError(t('aiProviders:error.modelRequired')); return }
    if (form.provider !== 'ollama' && !form.apiKey.trim()) { setError(t('aiProviders:error.apiKeyRequired')); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post<AiProviderRecord>('/ai-providers', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        provider: form.provider,
        model: form.model.trim(),
        apiKey: form.apiKey,
        baseUrl: form.baseUrl.trim() || undefined,
        isDefault: form.isDefault,
      })
      navigate(`/ai-providers/${data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('aiProviders:error.saveFailed'))
      setSaving(false)
    }
  }

  if (!authLoading && !can(Permission.AiProvidersCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('common:error.forbidden')}</Typography>
      </Box>
    )
  }

  if (authLoading || loadingExistingProvider) {
    return (
      <Box display="flex" justifyContent="center" py={12}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (existingProvider) {
    return (
      <Box maxWidth={720} mx="auto">
        <Box display="flex" alignItems="center" gap={1.5} mb={4}>
          <Button
            size="small"
            startIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate('/ai-providers')}
            sx={{ mr: 0.5 }}
          >
            {t('aiProviders:heading.title')}
          </Button>
          <Typography variant="h5" fontWeight={700}>{t('aiProviders:create.title')}</Typography>
        </Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('aiProviders:hint.singleProviderLimit')}
        </Alert>
        <Button variant="contained" onClick={() => navigate(`/ai-providers/${existingProvider.id}`)}>
          {t('aiProviders:action.editExistingProvider')}
        </Button>
      </Box>
    )
  }

  return (
    <Box maxWidth={720} mx="auto">
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button
          size="small"
          startIcon={<IconArrowLeft size={16} />}
          onClick={() => navigate('/ai-providers')}
          sx={{ mr: 0.5 }}
        >
          {t('aiProviders:heading.title')}
        </Button>
        <Typography variant="h5" fontWeight={700}>{t('aiProviders:create.title')}</Typography>
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
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('aiProviders:create.detailsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('aiProviders:create.detailsHint')}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth required
                label={t('aiProviders:label.name')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('aiProviders:placeholder.name')}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><IconRobot size={16} /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth multiline minRows={3}
                label={t('aiProviders:label.description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('aiProviders:placeholder.description')}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 1 — Configuration */}
      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('aiProviders:create.configTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('aiProviders:create.configHint')}</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
                {t('aiProviders:label.provider')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={form.provider}
                onChange={(_e, val) => { if (val) setProvider(val) }}
                sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { borderRadius: '6px !important', border: '1px solid !important', borderColor: 'divider !important', '&.Mui-selected': { borderColor: 'primary.main !important' } } }}
              >
                {PROVIDER_TYPES.map((pt) => (
                  <ToggleButton
                    key={pt}
                    value={pt}
                    disableRipple
                    disabled={!SUPPORTED_PROVIDERS.has(pt)}
                    sx={{
                      px: 1.5, py: 0.75, fontSize: '0.78rem', fontWeight: 500,
                      textTransform: 'none', lineHeight: 1.3,
                      '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(26,115,232,0.08)' },
                    }}
                  >
                    {SUPPORTED_PROVIDERS.has(pt) ? t(`aiProviders:provider.${pt}`) : `${t(`aiProviders:provider.${pt}`)} (Soon)`}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={MODEL_OPTIONS[form.provider] ?? []}
                value={form.model}
                onChange={(_, value) => setField('model', value ?? '')}
                onInputChange={(_, value) => setField('model', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    fullWidth
                    required
                    label={t('aiProviders:label.model')}
                    placeholder={t('aiProviders:placeholder.model')}
                    helperText={t('aiProviders:hint.modelPreset')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SecretAutocomplete
                value={form.apiKey}
                onChange={(value) => setField('apiKey', value)}
                label={form.provider === 'ollama' ? t('aiProviders:label.apiKeyOptional') : t('aiProviders:label.apiKeySecret')}
                secrets={secrets}
                loadingSecrets={loadingSecrets}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth
                label={t('aiProviders:label.baseUrl')}
                value={form.baseUrl}
                onChange={(e) => setField('baseUrl', e.target.value)}
                placeholder={t('aiProviders:placeholder.baseUrl')}
                helperText={t('aiProviders:hint.baseUrlOptional')}
              />
            </Grid>
            <Grid item xs={12}>
              <Box
                display="flex"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={1.5}
              >
                <FormControlLabel
                  sx={{ m: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  control={<Switch size="small" checked={form.isDefault} onChange={(e) => setField('isDefault', e.target.checked)} />}
                  label={<Typography variant="body2">{t('aiProviders:label.makeDefault')}</Typography>}
                />
                {can(Permission.AiProvidersExecute) ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={testing ? <CircularProgress size={14} color="inherit" /> : <IconPlayerPlay size={15} />}
                    disabled={testing || !canNext}
                    onClick={handleTest}
                    sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  >
                    {testing ? t('aiProviders:action.testingConnection') : t('aiProviders:action.testConnection')}
                  </Button>
                ) : <Box />}
              </Box>
              {testResult && (
                <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                  {testResult.ok ? t('aiProviders:toast.testSucceeded', { latency: testResult.latencyMs }) : testResult.message}
                </Alert>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 2 — Review */}
      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('aiProviders:create.reviewTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('aiProviders:create.reviewHint')}</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.name')}</Typography>
              <Typography fontWeight={700}>{form.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.provider')}</Typography>
              <Typography>{t(`aiProviders:provider.${form.provider}`)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.model')}</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{form.model}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.apiKey')}</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{'•'.repeat(Math.min(Math.max(form.apiKey.length, 8), 24))}</Typography>
            </Box>
            {form.baseUrl && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.baseUrl')}</Typography>
                <Typography variant="body2" fontFamily="monospace" fontSize="0.875rem">{form.baseUrl}</Typography>
              </Box>
            )}
            {form.isDefault && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.default')}</Typography>
                <Typography>{t('aiProviders:label.defaultEnabled')}</Typography>
              </Box>
            )}
            {form.description && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('aiProviders:label.description')}</Typography>
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
            {saving ? t('common:action.saving') : t('aiProviders:action.createProvider')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
