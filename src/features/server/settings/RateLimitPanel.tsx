import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box, FormControlLabel, Paper, Switch, TextField, Typography,
} from '@mui/material'
import { IconGauge } from '@tabler/icons-react'
import api from '../../../api'
import HelpButton from '../../../components/HelpButton'
import { SaveIndicator } from '../../../components/SaveIndicator'
import type { RateLimitPanelProps, SaveStatus } from '../types'

export function RateLimitPanel({ projectId, initialRateLimit, onChange }: RateLimitPanelProps) {
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
        setSaveError('Value must be between 1 and 10,000.'); setSaveStatus('error'); return
      }
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/rate-limit`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
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
            <Typography variant="subtitle2" fontWeight={700}>Request Limit</Typography>
            <HelpButton title="Request Limit">
              <Typography variant="body2" gutterBottom>
                Caps the number of MCP requests this server accepts per minute. When the limit is exceeded, the server responds with <strong>HTTP 429 (Too Many Requests)</strong> and a <code>Retry-After</code> header — the AI client should wait before retrying.
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Why set a rate limit?</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Protect the upstream API:</strong> many APIs have their own rate limits. Staying within them prevents your API credentials from being throttled or suspended.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Control costs:</strong> every call to a paid API costs money. A rate limit prevents AI agents from accidentally making thousands of calls in a loop.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Prevent runaway agents:</strong> AI agents in agentic workflows can sometimes get stuck in retry loops. A rate limit acts as a circuit breaker.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Fair usage:</strong> if multiple AI clients share this endpoint, a limit ensures no single client monopolises the quota.</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>How to set the right limit:</strong> check your upstream API's documented rate limit (e.g. 100 req/min) and set Arthur's limit slightly below it to leave headroom. Start conservative and increase if the AI frequently hits 429.
              </Typography>
              <Typography variant="body2">
                Toggle the switch to <strong>Inactive</strong> to disable rate limiting entirely. Changes save automatically.
              </Typography>
            </HelpButton>
          </Box>
          <SaveIndicator status={saveStatus} error={saveError} />
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch size="small" checked={enabled} onChange={(e) => handleEnabledChange(e.target.checked)} color="warning" />
            }
            label={<Typography variant="body2">{enabled ? 'Active' : 'Inactive'}</Typography>}
            sx={{ mr: 0 }}
          />
          <TextField
            size="small" type="number" label="Req / min"
            value={rpm} disabled={!enabled}
            onChange={(e) => handleRpmChange(Number(e.target.value))}
            inputProps={{ min: 1, max: 10000 }}
            sx={{ width: 130 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {enabled
            ? `Limits MCP server calls to ${rpm} req/min. Exceeding the limit returns HTTP 429.`
            : 'No request limit. Enable to restrict usage per minute.'}
        </Typography>
      </Box>
    </Paper>
  )
}
