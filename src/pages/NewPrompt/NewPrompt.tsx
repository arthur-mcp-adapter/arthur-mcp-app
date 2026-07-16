import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MonacoEditor from '@monaco-editor/react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
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
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconTag,
} from '@tabler/icons-react'
import api from '../../api'
import { Permission, useAuth } from '../../context/auth'
import { useColorMode } from '../../theme'
import { TagInput } from '../../features/prompts'
import type { PromptForm } from './promptForm.interface'
import type { PromptRecord } from './promptRecord.interface'


export default function NewPrompt() {
  const navigate = useNavigate()
  const { t } = useTranslation(['prompts', 'common'])
  const { mode: colorMode } = useColorMode()
  const { can, loading: authLoading } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedOpen, setExpandedOpen] = useState(false)
  const [form, setForm] = useState<PromptForm>({ name: '', description: '', content: '', tags: [] })

  const steps = [
    t('prompts:create.steps.details'),
    t('prompts:create.steps.content'),
    t('prompts:create.steps.review'),
  ]

  const setField = <K extends keyof PromptForm>(key: K, value: PromptForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const canNext = activeStep === 0
    ? form.name.trim().length > 0
    : activeStep === 1
      ? form.content.trim().length > 0
      : true

  const handleNext = () => {
    if (!canNext) {
      setError(activeStep === 0 ? t('prompts:error.nameRequired') : t('prompts:error.contentRequired'))
      return
    }
    setError('')
    setActiveStep((step) => step + 1)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t('prompts:error.nameRequired')); return }
    if (!form.content.trim()) { setError(t('prompts:error.contentRequired')); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post<PromptRecord>('/prompts', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        content: form.content,
        tags: form.tags,
      })
      navigate(`/prompts/${data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('prompts:error.createFailed'))
      setSaving(false)
    }
  }

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 12 },
  }

  if (!authLoading && !can(Permission.PromptsCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('common:error.forbidden')}</Typography>
      </Box>
    )
  }

  return (
    <Box maxWidth={760} mx="auto">
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.5} mb={4}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/prompts')} sx={{ mr: 0.5 }}>
          {t('prompts:heading.title')}
        </Button>
        <Typography variant="h5" fontWeight={700}>{t('prompts:create.title')}</Typography>
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
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('prompts:create.detailsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('prompts:create.detailsHint')}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                required
                label={t('prompts:label.name')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('prompts:placeholder.promptName')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={4}
                label={t('prompts:label.description')}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('prompts:placeholder.promptDescription')}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                {t('prompts:label.tags')}
              </Typography>
              <TagInput tags={form.tags} onChange={(tags) => setField('tags', tags)} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box flexGrow={1}>
              <Typography variant="subtitle2" fontWeight={700}>{t('prompts:create.contentTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('prompts:hint.variableSyntax', { open: '{{', close: '}}' })}
              </Typography>
            </Box>
            <Tooltip title={t('prompts:drawer.expandEditor')}>
              <IconButton size="small" onClick={() => setExpandedOpen(true)}>
                <IconArrowsMaximize size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ height: 420 }}>
            <MonacoEditor
              height="100%"
              language="plaintext"
              value={form.content}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              onChange={(value) => setField('content', value ?? '')}
              options={editorOptions}
            />
          </Box>
        </Paper>
      )}

      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('prompts:create.reviewTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{t('prompts:create.reviewHint')}</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('prompts:label.name')}</Typography>
              <Typography fontWeight={700}>{form.name}</Typography>
            </Box>
            {form.description && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('prompts:label.description')}</Typography>
                <Typography variant="body2">{form.description}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('prompts:label.contentPreview')}</Typography>
              <Box sx={{ mt: 0.75, p: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography component="pre" fontFamily="monospace" fontSize="0.78rem" whiteSpace="pre-wrap" m={0} sx={{ overflowWrap: 'anywhere' }}>
                  {form.content}
                </Typography>
              </Box>
            </Box>
            {form.tags.length > 0 && (
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {form.tags.map((tag) => <Chip key={tag} label={tag} size="small" icon={<IconTag size={12} />} />)}
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
          <Tooltip title={!canNext ? t('prompts:error.contentRequired') : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconCheck size={16} />}
                disabled={saving || !canNext}
                onClick={handleCreate}
              >
                {saving ? t('common:action.saving') : t('prompts:action.createPrompt')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Drawer anchor="right" open={expandedOpen} onClose={() => setExpandedOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 'calc(100vw - 280px)' }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>{t('prompts:drawer.promptContent')}</Typography>
          <Typography variant="caption" color="text.disabled">{t('prompts:hint.variableSyntax', { open: '{{', close: '}}' })}</Typography>
          <Tooltip title={t('prompts:drawer.collapse')}>
            <IconButton size="small" onClick={() => setExpandedOpen(false)}>
              <IconArrowsMinimize size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language="plaintext"
            value={form.content}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            onChange={(value) => setField('content', value ?? '')}
            options={{ ...editorOptions, minimap: { enabled: true }, fontSize: 14 }}
          />
        </Box>
      </Drawer>
    </Box>
  )
}
