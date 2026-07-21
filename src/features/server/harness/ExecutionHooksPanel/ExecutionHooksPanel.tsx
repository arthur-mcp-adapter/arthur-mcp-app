import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Chip,
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
import { IconCode, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { SaveStatus } from '../../types'
import type { HookPhase } from './hookPhase.type'
import type { HookType } from './hookType.type'
import type { ExecutionHook } from './executionHook.interface'
import { newHook } from './utils/newHook.util'
import type { ExecutionHooksPanelProps } from './executionHooksPanelProps.interface'
import { PHASE_COLOR } from './constants/phaseColor.constant'



export function ExecutionHooksPanel({ projectId }: ExecutionHooksPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [hooks, setHooks] = useState<ExecutionHook[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<ExecutionHook[]>(`/swagger/servers/${projectId}/harness/hooks`)
      .then((r) => setHooks(r.data))
      .catch(() => { /* use empty list */ })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: ExecutionHook[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/harness/hooks`, { hooks: next })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const addHook = () => {
    const next = [...hooks, newHook()]
    setHooks(next)
    scheduleSave(next)
  }

  const updateHook = (id: string, patch: Partial<ExecutionHook>) => {
    const next = hooks.map((h) => h.id === id ? { ...h, ...patch } : h)
    setHooks(next)
    scheduleSave(next)
  }

  const removeHook = (id: string) => {
    const next = hooks.filter((h) => h.id !== id)
    setHooks(next)
    scheduleSave(next)
  }

  const needsKeyValue = (type: HookType) => type !== 'log'
  const hookTypeLabels: Record<HookType, string> = {
    inject_header: t('label.injectRequestHeader'),
    add_query_param: t('label.addQueryParameter'),
    log: t('label.logCall'),
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconCode size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('harness.section.hooks')}</Typography>
            <HelpButton title={t('harness.section.hooks')} docsRefs={[
              { en: 'How-to-Configure-Execution-Hooks', ptBR: 'Como-Configurar-Execution-Hooks' },
              { en: 'What-Is-Execution-Hooks-For', ptBR: 'Para-que-Serve-Execution-Hooks' },
              { en: 'What-Is-Execution-Hooks', ptBR: 'O-que-e-Execution-Hooks' },
            ]}>
              <Typography variant="body2" gutterBottom>
                {t('help.executionHooks.intro')}
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('label.injectRequestHeader')}:</strong> {t('help.executionHooks.inject')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.addQueryParameter')}:</strong> {t('help.executionHooks.query')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.logCall')}:</strong> {t('help.executionHooks.log')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>{t('help.executionHooks.steps')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.executionHooks.result')}</Typography>
              <Typography variant="body2">{t('help.executionHooks.caution')}</Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('harness.section.hooksDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
      </Box>

      {hooks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('empty.noHooks')}
        </Typography>
      ) : (
        <Box mb={2}>
          {hooks.map((hook) => (
            <Box
              key={hook.id}
              display="flex" gap={1} alignItems="flex-start" mb={1.5}
              sx={{ opacity: hook.enabled ? 1 : 0.5, flexWrap: 'wrap' }}
            >
              <FormControl size="small" sx={{ width: 100 }}>
                <InputLabel>{t('label.phase')}</InputLabel>
                <Select
                  label={t('label.phase')}
                  value={hook.phase}
                  onChange={(e) => updateHook(hook.id, { phase: e.target.value as HookPhase })}
                  renderValue={(val) => (
                    <Chip label={t(`label.${val as HookPhase}`)} size="small" color={PHASE_COLOR[val as HookPhase]}
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                  )}
                >
                  <MenuItem value="before">{t('label.before')}</MenuItem>
                  <MenuItem value="after">{t('label.after')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 2, minWidth: 180 }}>
                <InputLabel>{t('label.action')}</InputLabel>
                <Select
                  label={t('label.action')}
                  value={hook.type}
                  onChange={(e) => updateHook(hook.id, { type: e.target.value as HookType })}
                >
                  {(Object.entries(hookTypeLabels) as [HookType, string][]).map(([val, label]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {needsKeyValue(hook.type) && (
                <>
                  <TextField
                    size="small" label={t('label.key')} placeholder={hook.type === 'inject_header' ? 'X-Tenant-ID' : 'param_name'}
                    value={hook.key}
                    onChange={(e) => updateHook(hook.id, { key: e.target.value })}
                    sx={{ flex: 1.5 }}
                  />
                  <TextField
                    size="small" label={t('label.value')} placeholder={t('placeholder.staticValue')}
                    value={hook.value}
                    onChange={(e) => updateHook(hook.id, { value: e.target.value })}
                    sx={{ flex: 2 }}
                  />
                </>
              )}

              <FormControlLabel
                control={
                  <Switch size="small" checked={hook.enabled}
                    onChange={(e) => updateHook(hook.id, { enabled: e.target.checked })} />
                }
                label=""
                sx={{ mx: 0, flexShrink: 0 }}
              />

              <Tooltip title={t('tooltip.removeHook')}>
                <IconButton size="small" color="error" onClick={() => removeHook(hook.id)}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={addHook}>
        {t('action.addHook')}
      </Button>
    </Paper>
  )
}
