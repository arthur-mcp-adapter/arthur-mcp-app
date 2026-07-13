import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { IconFilter, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { GeneratedTool, SaveStatus } from '../../types'
import type { ConstraintType } from './constraintType.type'
import type { InputConstraint } from './inputConstraint.interface'
import { newConstraint } from './utils/newConstraint.util'
import type { InputConstraintsPanelProps } from './inputConstraintsPanelProps.interface'
import { needsValue } from './constants/needsValue.constant'



export function InputConstraintsPanel({ projectId, tools }: InputConstraintsPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [constraints, setConstraints] = useState<InputConstraint[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<InputConstraint[]>(`/swagger/servers/${projectId}/guard-rails/input-constraints`)
      .then((r) => setConstraints(r.data))
      .catch(() => {})
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: InputConstraint[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/guard-rails/input-constraints`, { constraints: next })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const add = () => { const next = [...constraints, newConstraint()]; setConstraints(next); scheduleSave(next) }
  const update = (id: string, patch: Partial<InputConstraint>) => {
    const next = constraints.map((c) => c.id === id ? { ...c, ...patch } : c)
    setConstraints(next); scheduleSave(next)
  }
  const remove = (id: string) => { const next = constraints.filter((c) => c.id !== id); setConstraints(next); scheduleSave(next) }

  const toolOptions = ['*', ...tools.map((t) => t.name)]
  const constraintLabels: Record<ConstraintType, string> = {
    required: t('label.required'),
    block_value: t('label.blockValue'),
    max_length: t('label.maxLength'),
    allowed_values: t('label.allowedValues'),
    regex: t('label.regexMatch'),
  }
  const constraintHints: Record<ConstraintType, string> = {
    required: t('hint.constraintRequired'),
    block_value: t('placeholder.blockValue'),
    max_length: t('placeholder.maxLength'),
    allowed_values: t('placeholder.allowedValues'),
    regex: t('placeholder.regexMatch'),
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconFilter size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('guardRails.section.inputConstraints')}</Typography>
            <HelpButton title={t('guardRails.section.inputConstraints')}>
              <Typography variant="body2" gutterBottom>
                {t('help.inputConstraints.intro')}
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('label.required')}:</strong> {t('help.inputConstraints.required')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.blockValue')}:</strong> {t('help.inputConstraints.blockValue')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.maxLength')}:</strong> {t('help.inputConstraints.maxLength')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.allowedValues')}:</strong> {t('help.inputConstraints.allowedValues')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.regexMatch')}:</strong> {t('help.inputConstraints.regex')}</Typography></Box>
              </Box>
              <Typography variant="body2">{t('help.inputConstraints.allTools')}</Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('guardRails.section.inputConstraintsDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
      </Box>

      {constraints.length === 0 ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('empty.noInputConstraints')}
        </Typography>
      ) : (
        <Box mb={2}>
          {constraints.map((c) => (
            <Box key={c.id} display="flex" gap={1} alignItems="flex-start" mb={1.5} sx={{ opacity: c.enabled ? 1 : 0.5 }}>
              <FormControl size="small" sx={{ flex: 2, minWidth: 120 }}>
                <InputLabel>{t('logs.tool')}</InputLabel>
                <Select label={t('logs.tool')} value={c.toolName} onChange={(e) => update(c.id, { toolName: e.target.value })}>
                  {toolOptions.map((name) => (
                    <MenuItem key={name} value={name}>
                      <Typography variant="body2" fontFamily="monospace">{name === '*' ? t('label.allTools') : name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label={t('label.parameter')} placeholder="param_name"
                value={c.paramName} onChange={(e) => update(c.id, { paramName: e.target.value })}
                sx={{ flex: 1.5 }}
              />
              <FormControl size="small" sx={{ flex: 2, minWidth: 150 }}>
                <InputLabel>{t('label.constraint')}</InputLabel>
                <Select label={t('label.constraint')} value={c.type} onChange={(e) => update(c.id, { type: e.target.value as ConstraintType })}>
                  {(Object.entries(constraintLabels) as [ConstraintType, string][]).map(([val, label]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {needsValue.includes(c.type) && (
                <TextField
                  size="small" label={t('label.value')} placeholder={constraintHints[c.type]}
                  value={c.value} onChange={(e) => update(c.id, { value: e.target.value })}
                  sx={{ flex: 2 }}
                />
              )}
              <FormControlLabel
                control={<Switch size="small" checked={c.enabled} onChange={(e) => update(c.id, { enabled: e.target.checked })} />}
                label="" sx={{ mx: 0, flexShrink: 0 }}
              />
              <Tooltip title={t('action.remove')}>
                <IconButton size="small" color="error" onClick={() => remove(c.id)}><IconTrash size={16} /></IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={add}>
        {t('action.addConstraint')}
      </Button>
    </Paper>
  )
}
