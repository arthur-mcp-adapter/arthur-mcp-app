import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box, FormControlLabel, Paper, Switch, TextField, Typography,
} from '@mui/material'
import { IconGauge } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton } from '../../../../components'
import { SaveIndicator } from '../../../../components'
import type { RateLimitPanelProps, SaveStatus } from '../../types'

export function RateLimitPanel({ projectId, initialRateLimit, onChange }: RateLimitPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [enabled, setEnabled] = useState(initialRateLimit?.enabled ?? false)
  const [rpm, setRpm] = useState(initialRateLimit?.requestsPerMinute ?? 60)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ enabled: boolean; requestsPerMinute: number } | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: { enabled: boolean; requestsPerMinute: number }, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      if (p.requestsPerMinute < 1 || p.requestsPerMinute > 10000) {
        setSaveError(t('error.rateLimitRange')); setSaveStatus('error'); return
      }
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/rate-limit`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? t('error.saveFailed'))
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleEnabledChange = (val: boolean) => {
    setEnabled(val)
    scheduleSave({ enabled: val, requestsPerMinute: rpm }, 0)
  }

  const handleRpmChange = (val: number) => {
    setRpm(val)
    scheduleSave({ enabled, requestsPerMinute: val }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ color: enabled ? 'warning.main' : 'text.disabled', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconGauge size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('heading.requestLimit')}</Typography>
            <HelpButton title={t('heading.requestLimit')} docsRefs={[
              { en: 'How-to-Configure-Request-Limit', ptBR: 'Como-Configurar-Request-Limit' },
              { en: 'What-Is-Request-Limit-For', ptBR: 'Para-que-Serve-o-Request-Limit' },
              { en: 'What-Is-Request-Limit', ptBR: 'O-que-e-Request-Limit' },
            ]}>
              <Typography variant="body2" gutterBottom>
                {t('help.rateLimit.intro')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{t('help.rateLimit.whyTitle')}</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.protectTitle')}</strong> {t('help.rateLimit.protectText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.costTitle')}</strong> {t('help.rateLimit.costText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.runawayTitle')}</strong> {t('help.rateLimit.runawayText')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.fairTitle')}</strong> {t('help.rateLimit.fairText')}</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>{t('help.rateLimit.howTitle')}</strong> {t('help.rateLimit.howText')}
              </Typography>
              <Typography variant="body2" gutterBottom>{t('help.rateLimit.result')}</Typography>
              <Typography variant="body2">{t('help.rateLimit.troubleshoot')}</Typography>
            </HelpButton>
          </Box>
          <SaveIndicator status={saveStatus} error={saveError} />
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch size="small" checked={enabled} onChange={(e) => handleEnabledChange(e.target.checked)} color="warning" />
            }
            label={<Typography variant="body2">{enabled ? t('status.active') : t('status.inactive')}</Typography>}
            sx={{ mr: 0 }}
          />
          <TextField
            size="small" type="number" label={t('label.reqPerMin')}
            value={rpm} disabled={!enabled}
            onChange={(e) => handleRpmChange(Number(e.target.value))}
            inputProps={{ min: 1, max: 10000 }}
            sx={{ width: 130 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {enabled
            ? t('hint.rateLimitActive', { rpm })
            : t('hint.rateLimitInactive')}
        </Typography>
      </Box>
    </Paper>
  )
}
