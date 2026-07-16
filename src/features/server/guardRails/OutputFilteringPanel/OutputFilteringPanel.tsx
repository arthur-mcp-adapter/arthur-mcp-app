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
import { IconEyeOff, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { GeneratedTool, SaveStatus } from '../../types'
import type { FilterType } from './filterType.type'
import type { OutputFilter } from './outputFilter.interface'
import { newFilter } from './utils/newFilter.util'
import type { OutputFilteringPanelProps } from './outputFilteringPanelProps.interface'
import { needsReplacement } from './constants/needsReplacement.constant'



export function OutputFilteringPanel({ projectId, tools }: OutputFilteringPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [filters, setFilters] = useState<OutputFilter[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<OutputFilter[]>(`/swagger/servers/${projectId}/guard-rails/output-filters`)
      .then((r) => setFilters(r.data))
      .catch(() => {})
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: OutputFilter[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/guard-rails/output-filters`, { filters: next })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const add = () => { const next = [...filters, newFilter()]; setFilters(next); scheduleSave(next) }
  const update = (id: string, patch: Partial<OutputFilter>) => {
    const next = filters.map((f) => f.id === id ? { ...f, ...patch } : f)
    setFilters(next); scheduleSave(next)
  }
  const remove = (id: string) => { const next = filters.filter((f) => f.id !== id); setFilters(next); scheduleSave(next) }

  const toolOptions = ['*', ...tools.map((t) => t.name)]
  const filterLabels: Record<FilterType, string> = {
    mask_field: t('label.maskField'),
    remove_field: t('label.removeField'),
    redact_pattern: t('label.redactPattern'),
  }
  const filterHints: Record<FilterType, { target: string; replacement?: string }> = {
    mask_field: { target: t('placeholder.fieldPath'), replacement: t('placeholder.replacement') },
    remove_field: { target: t('placeholder.fieldPathToRemove') },
    redact_pattern: { target: t('placeholder.regexPattern'), replacement: t('placeholder.replacementRedacted') },
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconEyeOff size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('guardRails.section.outputFiltering')}</Typography>
            <HelpButton title={t('guardRails.section.outputFiltering')}>
              <Typography variant="body2" gutterBottom>
                {t('help.outputFiltering.intro')}
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('label.maskField')}:</strong> {t('help.outputFiltering.mask')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.removeField')}:</strong> {t('help.outputFiltering.remove')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.redactPattern')}:</strong> {t('help.outputFiltering.redact')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>{t('help.outputFiltering.steps')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.outputFiltering.result')}</Typography>
              <Typography variant="body2">{t('help.outputFiltering.caution')}</Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('guardRails.section.outputFilteringDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
      </Box>

      {filters.length === 0 ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('empty.noOutputFilters')}
        </Typography>
      ) : (
        <Box mb={2}>
          {filters.map((f) => (
            <Box key={f.id} display="flex" gap={1} alignItems="flex-start" mb={1.5} flexWrap="wrap" sx={{ opacity: f.enabled ? 1 : 0.5 }}>
              <FormControl size="small" sx={{ flex: 1.5, minWidth: 120 }}>
                <InputLabel>{t('logs.tool')}</InputLabel>
                <Select label={t('logs.tool')} value={f.toolName} onChange={(e) => update(f.id, { toolName: e.target.value })}>
                  {toolOptions.map((name) => (
                    <MenuItem key={name} value={name}>
                      <Typography variant="body2" fontFamily="monospace">{name === '*' ? t('label.all') : name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1.5, minWidth: 140 }}>
                <InputLabel>{t('label.filterType')}</InputLabel>
                <Select label={t('label.filterType')} value={f.type} onChange={(e) => update(f.id, { type: e.target.value as FilterType })}>
                  {(Object.entries(filterLabels) as [FilterType, string][]).map(([val, label]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label={t('label.target')} placeholder={filterHints[f.type].target}
                value={f.target} onChange={(e) => update(f.id, { target: e.target.value })}
                sx={{ flex: 2 }}
              />
              {needsReplacement.includes(f.type) && (
                <TextField
                  size="small" label={t('label.replacement')} placeholder={filterHints[f.type].replacement}
                  value={f.replacement} onChange={(e) => update(f.id, { replacement: e.target.value })}
                  sx={{ flex: 1.5 }}
                />
              )}
              <FormControlLabel
                control={<Switch size="small" checked={f.enabled} onChange={(e) => update(f.id, { enabled: e.target.checked })} />}
                label="" sx={{ mx: 0, flexShrink: 0 }}
              />
              <Tooltip title={t('action.remove')}>
                <IconButton size="small" color="error" onClick={() => remove(f.id)}><IconTrash size={16} /></IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={add}>
        {t('action.addFilter')}
      </Button>
    </Paper>
  )
}
