import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box, FormControlLabel, Paper, Switch, TextField, Typography,
} from '@mui/material'
import { IconArrowsMaximize } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { ResponseConfig, ResponseLimitPanelProps, SaveStatus } from '../../types'
import { DEFAULTS } from './constants/defaults.constant'



export function ResponseLimitPanel({ projectId, initialConfig, onChange }: ResponseLimitPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [maxResponseLen, setMaxResponseLen] = useState(initialConfig?.maxResponseLen ?? DEFAULTS.maxResponseLen)
  const [maxDepth, setMaxDepth] = useState(initialConfig?.maxDepth ?? DEFAULTS.maxDepth)
  const [arraySlice, setArraySlice] = useState(initialConfig?.arraySlice ?? DEFAULTS.arraySlice)
  const [errorTruncateLen, setErrorTruncateLen] = useState(initialConfig?.errorTruncateLen ?? DEFAULTS.errorTruncateLen)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<ResponseConfig | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: ResponseConfig, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/response-config`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? t('error.saveFailed'))
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange, t])

  const buildPayload = (overrides: Partial<ResponseConfig> = {}): ResponseConfig => ({
    enabled,
    maxResponseLen,
    maxDepth,
    arraySlice,
    errorTruncateLen,
    ...overrides,
  })

  const handleEnabledChange = (val: boolean) => {
    setEnabled(val)
    scheduleSave(buildPayload({ enabled: val }), 0)
  }

  const handleFieldChange = (field: keyof Omit<ResponseConfig, 'enabled'>, val: number, setter: (v: number) => void) => {
    setter(val)
    scheduleSave(buildPayload({ [field]: val }), 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ color: enabled ? 'info.main' : 'text.disabled', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconArrowsMaximize size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('heading.responseLimit')}</Typography>
            <HelpButton title={t('heading.responseLimit')} docsRefs={[
              { en: 'How-to-Configure-Response-Limits', ptBR: 'How-to-Configure-Response-Limits' },
              { en: 'What-Are-Response-Limits-For', ptBR: 'Para-que-Servem-os-Response-Limits' },
            ]}>
              <Typography variant="body2" gutterBottom>
                {t('help.responseLimit.intro')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{t('help.responseLimit.fieldsTitle')}</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('help.responseLimit.maxLenTitle')}</strong> {t('help.responseLimit.maxLenText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.responseLimit.maxDepthTitle')}</strong> {t('help.responseLimit.maxDepthText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.responseLimit.arraySliceTitle')}</strong> {t('help.responseLimit.arraySliceText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.responseLimit.errorLenTitle')}</strong> {t('help.responseLimit.errorLenText')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>{t('help.responseLimit.steps')}</Typography>
              <Typography variant="body2" gutterBottom>{t('help.responseLimit.result')}</Typography>
              <Typography variant="body2">{t('help.responseLimit.troubleshoot')}</Typography>
            </HelpButton>
          </Box>
          <SaveIndicator status={saveStatus} error={saveError} />
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
          <FormControlLabel
            control={
              <Switch size="small" checked={enabled} onChange={(e) => handleEnabledChange(e.target.checked)} color="info" />
            }
            label={<Typography variant="body2">{enabled ? t('status.active') : t('status.inactive')}</Typography>}
            sx={{ mr: 0 }}
          />
        </Box>

        {enabled && (
          <Box display="flex" alignItems="flex-start" gap={2} flexWrap="wrap">
            <TextField
              size="small" type="number" label={t('label.responseLimit.maxResponseLen')}
              value={maxResponseLen}
              onChange={(e) => handleFieldChange('maxResponseLen', Number(e.target.value), setMaxResponseLen)}
              inputProps={{ min: 1000, max: 10000000 }}
              sx={{ width: 160 }}
            />
            <TextField
              size="small" type="number" label={t('label.responseLimit.maxDepth')}
              value={maxDepth}
              onChange={(e) => handleFieldChange('maxDepth', Number(e.target.value), setMaxDepth)}
              inputProps={{ min: 1, max: 50 }}
              sx={{ width: 130 }}
            />
            <TextField
              size="small" type="number" label={t('label.responseLimit.arraySlice')}
              value={arraySlice}
              onChange={(e) => handleFieldChange('arraySlice', Number(e.target.value), setArraySlice)}
              inputProps={{ min: 1, max: 10000 }}
              sx={{ width: 130 }}
            />
            <TextField
              size="small" type="number" label={t('label.responseLimit.errorTruncateLen')}
              value={errorTruncateLen}
              onChange={(e) => handleFieldChange('errorTruncateLen', Number(e.target.value), setErrorTruncateLen)}
              inputProps={{ min: 100, max: 1000000 }}
              sx={{ width: 160 }}
            />
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {enabled
            ? t('hint.responseLimitActive')
            : t('hint.responseLimitInactive')}
        </Typography>
      </Box>
    </Paper>
  )
}
