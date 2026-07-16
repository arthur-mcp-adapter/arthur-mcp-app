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
import { IconLock, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { GeneratedTool, SaveStatus } from '../../types'
import type { RestrictionType } from './restrictionType.type'
import type { ToolRestriction } from './toolRestriction.interface'
import { newRestriction } from './utils/newRestriction.util'
import type { ToolRestrictionsPanelProps } from './toolRestrictionsPanelProps.interface'




export function ToolRestrictionsPanel({ projectId, tools }: ToolRestrictionsPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [restrictions, setRestrictions] = useState<ToolRestriction[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<ToolRestriction[]>(`/swagger/servers/${projectId}/guard-rails/tool-restrictions`)
      .then((r) => setRestrictions(r.data))
      .catch(() => {})
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: ToolRestriction[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/guard-rails/tool-restrictions`, { restrictions: next })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const add = () => { const next = [...restrictions, newRestriction()]; setRestrictions(next); scheduleSave(next) }
  const update = (id: string, patch: Partial<ToolRestriction>) => {
    const next = restrictions.map((r) => r.id === id ? { ...r, ...patch } : r)
    setRestrictions(next); scheduleSave(next)
  }
  const remove = (id: string) => { const next = restrictions.filter((r) => r.id !== id); setRestrictions(next); scheduleSave(next) }

  const toolOptions = ['*', ...tools.map((t) => t.name)]
  const restrictionLabels: Record<RestrictionType, string> = {
    blocked: t('label.blocked'),
    max_calls_per_session: t('label.maxCallsPerSession'),
    require_confirmation: t('label.requireConfirmation'),
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconLock size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('guardRails.section.toolRestrictions')}</Typography>
            <HelpButton title={t('guardRails.section.toolRestrictions')}>
              <Typography variant="body2" gutterBottom>
                {t('help.toolRestrictions.intro')}
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('label.blocked')}:</strong> {t('help.toolRestrictions.blocked')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.maxCallsPerSession')}:</strong> {t('help.toolRestrictions.maxCalls')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.requireConfirmation')}:</strong> {t('help.toolRestrictions.confirmation')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>{t('help.toolRestrictions.steps')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.toolRestrictions.result')}</Typography>
              <Typography variant="body2">{t('help.toolRestrictions.caution')}</Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('guardRails.section.toolRestrictionsDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
      </Box>

      {restrictions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('empty.noToolRestrictions')}
        </Typography>
      ) : (
        <Box mb={2}>
          {restrictions.map((r) => (
            <Box key={r.id} display="flex" gap={1} alignItems="center" mb={1.5} flexWrap="wrap" sx={{ opacity: r.enabled ? 1 : 0.5 }}>
              <FormControl size="small" sx={{ flex: 2, minWidth: 140 }}>
                <InputLabel>{t('logs.tool')}</InputLabel>
                <Select label={t('logs.tool')} value={r.toolName} onChange={(e) => update(r.id, { toolName: e.target.value })}>
                  {toolOptions.map((name) => (
                    <MenuItem key={name} value={name}>
                      <Typography variant="body2" fontFamily="monospace">{name === '*' ? t('label.allTools') : name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 2.5, minWidth: 190 }}>
                <InputLabel>{t('label.restriction')}</InputLabel>
                <Select label={t('label.restriction')} value={r.type} onChange={(e) => update(r.id, { type: e.target.value as RestrictionType })}>
                  {(Object.entries(restrictionLabels) as [RestrictionType, string][]).map(([val, label]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {r.type === 'max_calls_per_session' && (
                <TextField
                  size="small" type="number" label={t('label.maxCalls')}
                  value={r.limit} onChange={(e) => update(r.id, { limit: Math.max(1, Number(e.target.value)) })}
                  inputProps={{ min: 1 }}
                  sx={{ width: 110 }}
                />
              )}
              <FormControlLabel
                control={<Switch size="small" checked={r.enabled} onChange={(e) => update(r.id, { enabled: e.target.checked })} />}
                label="" sx={{ mx: 0, flexShrink: 0 }}
              />
              <Tooltip title={t('action.remove')}>
                <IconButton size="small" color="error" onClick={() => remove(r.id)}><IconTrash size={16} /></IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={add}>
        {t('action.addRestriction')}
      </Button>
    </Paper>
  )
}
