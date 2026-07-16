import { useRef, useState } from 'react'
import {
  Box, Button, CircularProgress, Divider, FormControl, FormControlLabel,
  IconButton, InputLabel, MenuItem, Paper, Select, Switch, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconClock, IconPlayerPause, IconPlayerPlay, IconPlus, IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../../../context/auth'
import api from '../../../../api'
import { SaveIndicator } from '../../../../components'
import type { SaveStatus, ScheduleEntry } from '../../types'
import type { ProjectControlsPanelProps } from './projectControlsPanelProps.interface'
import { formatHour } from './utils/formatHour.util'
import { TIMEZONES } from './constants/timezones.constant'



export function ProjectControlsPanel({ projectId, initialPaused, initialMaintenance, initialAvailability, onPausedChange }: ProjectControlsPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [paused, setPaused] = useState(initialPaused ?? false)
  const [pauseSaving, setPauseSaving] = useState(false)
  const { can } = useAuth()

  const [maintEnabled, setMaintEnabled] = useState(initialMaintenance?.enabled ?? false)
  const [maintMsg, setMaintMsg] = useState(initialMaintenance?.message ?? '')
  const [maintSave, setMaintSave] = useState<SaveStatus>('idle')

  const [avEnabled, setAvEnabled] = useState(initialAvailability?.enabled ?? false)
  const [avTz, setAvTz] = useState(initialAvailability?.timezone ?? 'UTC')
  const [avSchedule, setAvSchedule] = useState<ScheduleEntry[]>(
    (initialAvailability?.schedule ?? []).map(e => ({ ...e, id: crypto.randomUUID() }))
  )
  const [avSave, setAvSave] = useState<SaveStatus>('idle')

  const maintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePause = async (val: boolean) => {
    setPauseSaving(true)
    try {
      await api.patch(`/swagger/servers/${projectId}/pause`, { isPaused: val })
      setPaused(val)
      onPausedChange(val)
    } finally { setPauseSaving(false) }
  }

  const scheduleMaint = (enabled: boolean, message: string) => {
    if (maintTimer.current) clearTimeout(maintTimer.current)
    maintTimer.current = setTimeout(async () => {
      setMaintSave('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/maintenance`, { enabled, message })
        setMaintSave('saved'); setTimeout(() => setMaintSave('idle'), 2000)
      } catch { setMaintSave('error') }
    }, 700)
  }

  const saveAv = (enabled: boolean, timezone: string, schedule: ScheduleEntry[]) => {
    if (avTimer.current) clearTimeout(avTimer.current)
    avTimer.current = setTimeout(async () => {
      setAvSave('saving')
      try {
        const payload = { enabled, timezone, schedule: schedule.map(({ day, startHour, endHour }) => ({ day, startHour, endHour })) }
        await api.patch(`/swagger/servers/${projectId}/availability`, payload)
        setAvSave('saved'); setTimeout(() => setAvSave('idle'), 2000)
      } catch { setAvSave('error') }
    }, 700)
  }

  const addEntry = () => {
    const next = [...avSchedule, { id: crypto.randomUUID(), day: 1, startHour: 9, endHour: 18 }]
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const removeEntry = (id: string) => {
    const next = avSchedule.filter(e => e.id !== id)
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const updateEntry = (id: string, field: keyof Omit<ScheduleEntry, 'id'>, value: number) => {
    const next = avSchedule.map(e => e.id === id ? { ...e, [field]: value } : e)
    setAvSchedule(next)
    saveAv(avEnabled, avTz, next)
  }

  const hours = Array.from({ length: 25 }, (_, i) => i)
  const DAY_LABELS = [
    t('days.sunday'),
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday'),
  ]

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* Pause */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        {paused ? <IconPlayerPause size={20} className="project-controls-panel-status-icon-paused" /> : <IconPlayerPlay size={20} className="project-controls-panel-status-icon-running" />}
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {paused ? t('label.serverPaused') : t('label.servicesRunning')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {paused ? t('label.allRequestsReturn503') : t('label.aiCanCallTools')}
          </Typography>
        </Box>
        {can(Permission.ServersToggleActive) && (
          <Tooltip title={paused ? t('tooltip.resumeServer') : t('tooltip.pauseServer')}>
            <span>
              <Button size="small" variant={paused ? 'contained' : 'outlined'}
                color={paused ? 'success' : 'warning'}
                startIcon={pauseSaving ? <CircularProgress size={13} color="inherit" /> : paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                onClick={() => handlePause(!paused)} disabled={pauseSaving}>
                {paused ? t('action.resume') : t('action.pause')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Maintenance mode */}
      <Box mb={2}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>{t('heading.maintenanceMessage')}</Typography>
          <SaveIndicator status={maintSave} />
          <FormControlLabel
            control={<Switch size="small" checked={maintEnabled} color="warning"
              onChange={(e) => { setMaintEnabled(e.target.checked); scheduleMaint(e.target.checked, maintMsg) }} />}
            label={<Typography variant="caption">{maintEnabled ? t('status.on') : t('status.off')}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {maintEnabled && (
          <TextField size="small" fullWidth multiline minRows={3} maxRows={6}
            label={t('label.maintenanceMessageToClients')}
            placeholder={t('hint.maintenancePlaceholder')}
            value={maintMsg}
            onChange={(e) => { setMaintMsg(e.target.value); scheduleMaint(maintEnabled, e.target.value) }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          {t('hint.maintenanceHint')}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Availability days */}
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <IconClock size={18} />
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>{t('heading.availabilityDays')}</Typography>
          <SaveIndicator status={avSave} />
          <FormControlLabel
            control={<Switch size="small" checked={avEnabled} color="primary"
              onChange={(e) => { setAvEnabled(e.target.checked); saveAv(e.target.checked, avTz, avSchedule) }} />}
            label={<Typography variant="caption">{avEnabled ? t('status.on') : t('status.off')}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {avEnabled && (
          <Box>
            {/* Timezone */}
            <FormControl size="small" sx={{ minWidth: 200, mb: 1.5 }}>
              <InputLabel>{t('label.timezone')}</InputLabel>
              <Select value={avTz} label={t('label.timezone')}
                onChange={(e) => { setAvTz(e.target.value); saveAv(avEnabled, e.target.value, avSchedule) }}>
                {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Schedule entries */}
            <Box display="flex" flexDirection="column" gap={1} mb={1}>
              {avSchedule.map(entry => (
                <Box key={entry.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>{t('label.day')}</InputLabel>
                    <Select value={entry.day} label={t('label.day')}
                      onChange={(e) => updateEntry(entry.id, 'day', Number(e.target.value))}>
                      {DAY_LABELS.map((label, i) => <MenuItem key={i} value={i}>{label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>{t('label.from')}</InputLabel>
                    <Select value={entry.startHour} label={t('label.from')}
                      onChange={(e) => updateEntry(entry.id, 'startHour', Number(e.target.value))}>
                      {hours.filter(h => h < entry.endHour).map(h => <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary">–</Typography>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>{t('label.to')}</InputLabel>
                    <Select value={entry.endHour} label={t('label.to')}
                      onChange={(e) => updateEntry(entry.id, 'endHour', Number(e.target.value))}>
                      {hours.filter(h => h > entry.startHour).map(h => <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <IconButton size="small" color="error" onClick={() => removeEntry(entry.id)}>
                    <IconX size={18} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button size="small" startIcon={<IconPlus size={18} />} onClick={addEntry}>
              {t('action.addEntry')}
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          {t('hint.availabilityHint')}
        </Typography>
      </Box>
    </Paper>
  )
}
