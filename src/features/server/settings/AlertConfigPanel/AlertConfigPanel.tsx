import { useRef, useState } from 'react'
import {
  Box,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { IconBell } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { SaveIndicator } from '../../../../components'
import type { SaveStatus } from '../../types'
import type { AlertConfigPanelProps } from './alertConfigPanelProps.interface'


export function AlertConfigPanel({ projectId, initialConfig }: AlertConfigPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [threshold, setThreshold] = useState(initialConfig?.errorThresholdPct ?? 20)
  const [email, setEmail] = useState(initialConfig?.notifyEmail ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (en: boolean, thr: number, em: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/alert-config`, {
          enabled: en,
          errorThresholdPct: thr,
          notifyEmail: em,
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={enabled ? 2 : 0}>
        <IconBell size={18} />
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>{t('heading.errorAlerts')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('hint.errorAlertsDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
        <FormControlLabel
          control={<Switch size="small" checked={enabled} color="warning"
            onChange={(e) => { setEnabled(e.target.checked); scheduleSave(e.target.checked, threshold, email) }} />}
          label={<Typography variant="caption">{enabled ? t('status.on') : t('status.off')}</Typography>}
          sx={{ mr: 0 }} />
      </Box>

      {enabled && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={5}>
            <TextField size="small" fullWidth label={t('label.alertThreshold')}
              type="number" inputProps={{ min: 1, max: 100 }}
              value={threshold}
              onChange={(e) => {
                const value = Math.max(1, Math.min(100, Number(e.target.value)))
                setThreshold(value)
                scheduleSave(enabled, value, email)
              }}
            />
          </Grid>
          <Grid item xs={12} sm={7}>
            <TextField size="small" fullWidth label={t('label.alertEmail')}
              type="email" placeholder="manager@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); scheduleSave(enabled, threshold, e.target.value) }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              {t('hint.alertHint')}
            </Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  )
}
