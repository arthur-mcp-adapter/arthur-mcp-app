import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { IconClock, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { GeneratedTool, SaveStatus } from '../../types'

interface ToolTimeout {
  toolName: string
  timeoutMs: number
}

interface TimeoutConfig {
  globalTimeoutMs: number
  overrides: ToolTimeout[]
}

const DEFAULT_CONFIG: TimeoutConfig = { globalTimeoutMs: 30000, overrides: [] }

export function TimeoutPanel({ projectId, tools }: { projectId: string; tools: GeneratedTool[] }) {
  const { t } = useTranslation('serverDetail')
  const [config, setConfig] = useState<TimeoutConfig>(DEFAULT_CONFIG)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<TimeoutConfig>(`/swagger/servers/${projectId}/harness/timeout`)
      .then((r) => setConfig(r.data))
      .catch(() => { /* use defaults */ })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: TimeoutConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/harness/timeout`, next)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const updateGlobal = (ms: number) => {
    const next = { ...config, globalTimeoutMs: ms }
    setConfig(next)
    scheduleSave(next)
  }

  const addOverride = () => {
    const available = tools.find((t) => !config.overrides.some((o) => o.toolName === t.name))
    const next = { ...config, overrides: [...config.overrides, { toolName: available?.name ?? '', timeoutMs: config.globalTimeoutMs }] }
    setConfig(next)
    scheduleSave(next)
  }

  const updateOverride = (idx: number, patch: Partial<ToolTimeout>) => {
    const next = { ...config, overrides: config.overrides.map((o, i) => i === idx ? { ...o, ...patch } : o) }
    setConfig(next)
    scheduleSave(next)
  }

  const removeOverride = (idx: number) => {
    const next = { ...config, overrides: config.overrides.filter((_, i) => i !== idx) }
    setConfig(next)
    scheduleSave(next)
  }

  const usedTools = config.overrides.map((o) => o.toolName)
  const availableTools = tools.filter((t) => !usedTools.includes(t.name))

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconClock size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('harness.section.timeouts')}</Typography>
            <HelpButton title={t('harness.section.timeouts')}>
              <Typography variant="body2" gutterBottom>
                {t('help.timeout.intro')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                {t('help.timeout.overrides')}
              </Typography>
              <Typography variant="body2">
                {t('help.timeout.upstream')}
              </Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('harness.section.timeoutsDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small" type="number" label={t('label.globalTimeoutMs')}
          value={config.globalTimeoutMs}
          onChange={(e) => updateGlobal(Math.max(1000, Number(e.target.value)))}
          inputProps={{ min: 1000, step: 1000 }}
          sx={{ width: 200 }}
        />
        <Typography variant="caption" color="text.secondary">
          {t('label.timeoutAppliesAll', { seconds: (config.globalTimeoutMs / 1000).toFixed(1) })}
        </Typography>
      </Box>

      {config.overrides.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
            {t('label.perToolOverrides')}
          </Typography>
          {config.overrides.map((override, idx) => (
            <Box key={idx} display="flex" gap={1} alignItems="center" mb={1}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel>{t('logs.tool')}</InputLabel>
                <Select
                  label={t('logs.tool')}
                  value={override.toolName}
                  onChange={(e) => updateOverride(idx, { toolName: e.target.value })}
                >
                  {[override.toolName, ...availableTools.map((t) => t.name)].filter(Boolean).map((name) => (
                    <MenuItem key={name} value={name}>
                      <Typography variant="body2" fontFamily="monospace">{name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" type="number" label={t('label.timeoutMs')}
                value={override.timeoutMs}
                onChange={(e) => updateOverride(idx, { timeoutMs: Math.max(1000, Number(e.target.value)) })}
                inputProps={{ min: 1000, step: 1000 }}
                sx={{ width: 160 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {(override.timeoutMs / 1000).toFixed(1)}s
              </Typography>
              <Tooltip title={t('tooltip.removeOverride')}>
                <IconButton size="small" color="error" onClick={() => removeOverride(idx)}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </>
      )}

      {availableTools.length > 0 && (
        <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={addOverride} sx={{ mt: config.overrides.length > 0 ? 1 : 0 }}>
          {t('action.addToolOverride')}
        </Button>
      )}
    </Paper>
  )
}
