import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer, FormControlLabel,
  IconButton, Switch, TextField, Typography,
} from '@mui/material'
import { IconPlus, IconX } from '@tabler/icons-react'
import type { ChainStep, GeneratedTool, JsonSchema, ToolChain } from '../types'
import { StepBuilder } from './StepBuilder'

function newStepId() { return `step_${Math.random().toString(36).slice(2, 10)}` }

export function ChainDialog({
  open,
  editTarget,
  tools,
  onClose,
  onSaved,
}: {
  open: boolean
  editTarget: ToolChain | null
  tools: GeneratedTool[]
  onClose: () => void
  onSaved: (chain: ToolChain) => void
}) {
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
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{editTarget ? `Edit chain — ${editTarget.name}` : 'New chain'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              size="small" label="Name" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. search_and_book"
              sx={{ flex: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
              label="Enabled"
              sx={{ mt: 0.25, flexShrink: 0 }}
            />
          </Box>
          <TextField
            size="small" fullWidth multiline minRows={2} label="Description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this chain does…"
          />

          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>Steps</Typography>
              <Button size="small" startIcon={<IconPlus size={14} />} onClick={addStep}
                disabled={tools.length === 0}>
                Add step
              </Button>
            </Box>

            {steps.length === 0 ? (
              <Alert severity="info">
                Click <strong>Add step</strong> to start building the chain.
                Each step calls a tool and passes its output to the next step.
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
                Auto-derived chain inputs (exposed to the MCP client)
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
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={async () => {
            if (!name.trim()) { setError('Name is required.'); return }
            if (steps.length === 0) { setError('Add at least one step.'); return }
            setSaving(true); setError('')
            onSaved({ id: editTarget?.id ?? '', name: name.trim(), description: description.trim() || undefined, inputSchema, steps, enabled })
          }}
        >
          {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create chain'}
        </Button>
      </Box>
    </Drawer>
  )
}
