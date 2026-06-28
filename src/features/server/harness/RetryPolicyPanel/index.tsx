import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { IconRefresh } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { HelpButton, SaveIndicator } from '../../../../components'
import type { SaveStatus } from '../../types'

const RETRY_CODES = [429, 500, 502, 503, 504]

interface RetryPolicy {
  enabled: boolean
  maxRetries: number
  backoffStrategy: 'fixed' | 'exponential' | 'linear'
  initialDelayMs: number
  retryOnCodes: number[]
}

const DEFAULT: RetryPolicy = {
  enabled: false,
  maxRetries: 3,
  backoffStrategy: 'exponential',
  initialDelayMs: 500,
  retryOnCodes: [429, 500, 502, 503, 504],
}

export function RetryPolicyPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('serverDetail')
  const [policy, setPolicy] = useState<RetryPolicy>(DEFAULT)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<RetryPolicy>(`/swagger/servers/${projectId}/harness/retry-policy`)
      .then((r) => setPolicy(r.data))
      .catch(() => { /* backend not yet implemented — use defaults */ })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [projectId])

  const scheduleSave = (next: RetryPolicy) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/harness/retry-policy`, next)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const update = (patch: Partial<RetryPolicy>) => {
    const next = { ...policy, ...patch }
    setPolicy(next)
    scheduleSave(next)
  }

  const toggleCode = (code: number) => {
    const codes = policy.retryOnCodes.includes(code)
      ? policy.retryOnCodes.filter((c) => c !== code)
      : [...policy.retryOnCodes, code]
    update({ retryOnCodes: codes })
  }

  const maxWaitSeconds = policy.backoffStrategy === 'fixed'
    ? (policy.maxRetries * policy.initialDelayMs / 1000).toFixed(1)
    : policy.backoffStrategy === 'linear'
      ? ((policy.maxRetries * (policy.maxRetries + 1) / 2) * policy.initialDelayMs / 1000).toFixed(1)
      : ((Math.pow(2, policy.maxRetries) - 1) * policy.initialDelayMs / 1000).toFixed(1)

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={policy.enabled ? 2 : 0}>
        <IconRefresh size={18} />
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('harness.section.retryPolicy')}</Typography>
            <HelpButton title={t('harness.section.retryPolicy')}>
              <Typography variant="body2" gutterBottom>
                {t('help.retryPolicy.intro')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{t('help.retryPolicy.backoffTitle')}</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>{t('label.fixed')}:</strong> {t('help.retryPolicy.fixed')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.linear')}:</strong> {t('help.retryPolicy.linear')}</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>{t('label.exponential')}:</strong> {t('help.retryPolicy.exponential')}</Typography></Box>
              </Box>
              <Typography variant="body2">
                {t('help.retryPolicy.safeCodes')}
              </Typography>
            </HelpButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('harness.section.retryPolicyDesc')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
        <FormControlLabel
          control={
            <Switch size="small" checked={policy.enabled} color="warning"
              onChange={(e) => update({ enabled: e.target.checked })} />
          }
          label={<Typography variant="caption">{policy.enabled ? t('status.on') : t('status.off')}</Typography>}
          sx={{ mr: 0 }}
        />
      </Box>

      {policy.enabled && (
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              size="small" type="number" label={t('label.maxRetries')}
              value={policy.maxRetries}
              onChange={(e) => update({ maxRetries: Math.max(1, Math.min(10, Number(e.target.value))) })}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 140 }}
            />
            <TextField
              size="small" type="number" label={t('label.initialDelayMs')}
              value={policy.initialDelayMs}
              onChange={(e) => update({ initialDelayMs: Math.max(100, Number(e.target.value)) })}
              inputProps={{ min: 100, step: 100 }}
              sx={{ width: 160 }}
            />
            <FormControl size="small" sx={{ width: 170 }}>
              <InputLabel>{t('label.backoffStrategy')}</InputLabel>
              <Select
                label={t('label.backoffStrategy')}
                value={policy.backoffStrategy}
                onChange={(e) => update({ backoffStrategy: e.target.value as RetryPolicy['backoffStrategy'] })}
              >
                <MenuItem value="fixed">{t('label.fixed')}</MenuItem>
                <MenuItem value="linear">{t('label.linear')}</MenuItem>
                <MenuItem value="exponential">{t('label.exponential')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
              {t('label.retryOnHttpCodes')}
            </Typography>
            <Box display="flex" gap={0.75} flexWrap="wrap">
              {RETRY_CODES.map((code) => {
                const active = policy.retryOnCodes.includes(code)
                return (
                  <Chip
                    key={code}
                    label={code}
                    size="small"
                    clickable
                    onClick={() => toggleCode(code)}
                    color={active ? 'warning' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}
                  />
                )
              })}
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary">
            {t('label.retryMaxWaitPrefix', {
              retries: policy.maxRetries,
              strategy: t(`label.${policy.backoffStrategy}`),
              delay: policy.initialDelayMs,
            })}{' '}
            <strong>{t('label.seconds', { value: maxWaitSeconds })}</strong>.
          </Typography>
        </Box>
      )}
    </Paper>
  )
}
