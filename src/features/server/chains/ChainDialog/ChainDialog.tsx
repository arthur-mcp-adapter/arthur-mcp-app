import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer, FormControlLabel,
  IconButton, Switch, TextField, Typography,
} from '@mui/material'
import { IconPlus, IconX } from '@tabler/icons-react'
import type { ChainStep, GeneratedTool, JsonSchema, ToolChain } from '../../types'
import { StepBuilder } from '../StepBuilder'
import { newStepId } from './utils/newStepId.util'
import type { ChainDialogProps } from './chainDialogProps.interface'




export function ChainDialog({
  open,
  editTarget,
  tools,
  onClose,
  onSaved,
}: ChainDialogProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [steps, setSteps] = useState<ChainStep[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editTarget?.name ?? '')
      setDescription(editTarget?.description ?? '')
      setEnabled(editTarget?.enabled !== false)
      setSteps(editTarget?.steps ?? [])
      setError('')
    }
  }, [open, editTarget])

  const chainInputParams = useMemo(() => {
    const params = new Set<string>()
    for (const step of steps) {
      for (const m of step.inputMapping) {
        if (m.input.source === 'chain_input' && m.input.paramName.trim()) {
          params.add(m.input.paramName.trim())
        }
      }
    }
    return [...params]
  }, [steps])

  const inputSchema: JsonSchema = useMemo(() => ({
    type: 'object',
    properties: Object.fromEntries(chainInputParams.map((p) => [p, { type: 'string', description: `Chain input: ${p}` }])),
    required: chainInputParams,
  }), [chainInputParams])

  const addStep = () => {
    setSteps((prev) => [...prev, { id: newStepId(), toolName: tools[0]?.name ?? '', inputMapping: [] }])
  }

  const updateStep = (i: number, s: ChainStep) => setSteps((prev) => prev.map((x, idx) => idx === i ? s : x))
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i))
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const arr = [...prev]
      const j = i + dir
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 600 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>
          {editTarget ? t('heading.editChain', { name: editTarget.name }) : t('action.newChain')}
        </Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              size="small" label={t('common:label.name')} required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('placeholder.chainNameExample')}
              sx={{ flex: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
              label={t('common:status.enabled')}
              sx={{ mt: 0.25, flexShrink: 0 }}
            />
          </Box>
          <TextField
            size="small" fullWidth multiline minRows={2} label={t('common:label.description')} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('placeholder.chainDescription')}
          />

          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>{t('heading.steps')}</Typography>
              <Button size="small" startIcon={<IconPlus size={14} />} onClick={addStep}
                disabled={tools.length === 0}>
                {t('action.addStep')}
              </Button>
            </Box>

            {steps.length === 0 ? (
              <Alert severity="info">
                {t('hint.addStepToStart')}
              </Alert>
            ) : (
              steps.map((step, i) => (
                <StepBuilder
                  key={step.id}
                  step={step}
                  index={i}
                  total={steps.length}
                  tools={tools}
                  previousSteps={steps.slice(0, i)}
                  onChange={(s) => updateStep(i, s)}
                  onRemove={() => removeStep(i)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                />
              ))
            )}
          </Box>

          {chainInputParams.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                {t('label.autoDetectedInputs')}
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {chainInputParams.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined" color="primary"
                    sx={{ fontSize: '0.72rem', fontFamily: 'monospace', height: 20 }} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={onClose}>{t('common:action.cancel')}</Button>
        <Button
          variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={async () => {
            if (!name.trim()) { setError(t('error.chainNameRequired')); return }
            if (steps.length === 0) { setError(t('error.chainStepRequired')); return }
            setSaving(true); setError('')
            try {
              await Promise.resolve(onSaved({
                id: editTarget?.id ?? '',
                name: name.trim(),
                description: description.trim() || undefined,
                inputSchema,
                steps,
                enabled,
              }))
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? t('status.saving') : editTarget ? t('action.saveChanges') : t('action.createChain')}
        </Button>
      </Box>
    </Drawer>
  )
}
