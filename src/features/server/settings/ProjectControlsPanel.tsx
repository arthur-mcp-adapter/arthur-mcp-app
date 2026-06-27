import { useRef, useState } from 'react'
import {
  Box, Button, CircularProgress, Divider, FormControl, FormControlLabel,
  IconButton, InputLabel, MenuItem, Paper, Select, Switch, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  IconClock, IconPlayerPause, IconPlayerPlay, IconPlus, IconX,
} from '@tabler/icons-react'
import { useAuth, Permission } from '../../../context/AuthContext'
import api from '../../../api'
import { SaveIndicator } from '../../../components/SaveIndicator'
import type { SaveStatus, ScheduleEntry } from '../types'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

export function ProjectControlsPanel({ projectId, initialPaused, initialMaintenance, initialAvailability, onPausedChange }: {
  projectId: string
  initialPaused?: boolean
  initialMaintenance?: { enabled: boolean; message: string }
  initialAvailability?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  onPausedChange: (v: boolean) => void
}) {
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
  const fmtHour = (h: number) => h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* Pause */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        {paused ? <IconPlayerPause size={20} style={{ color: '#FFAE1F' }} /> : <IconPlayerPlay size={20} style={{ color: '#13DEB9' }} />}
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {paused ? 'Server is paused — AI cannot use it right now' : 'Server is running normally'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {paused ? 'All MCP requests return a 503 error until you resume.' : 'Your AI assistant can call tools in this server.'}
          </Typography>
        </Box>
        {can(Permission.ServersToggleActive) && (
          <Tooltip title={paused ? 'Resume — allow AI to use this server again' : 'Pause — block all AI requests to this server'}>
            <span>
              <Button size="small" variant={paused ? 'contained' : 'outlined'}
                color={paused ? 'success' : 'warning'}
                startIcon={pauseSaving ? <CircularProgress size={13} color="inherit" /> : paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                onClick={() => handlePause(!paused)} disabled={pauseSaving}>
                {paused ? 'Resume' : 'Pause'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Maintenance mode */}
      <Box mb={2}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>Maintenance message</Typography>
          <SaveIndicator status={maintSave} />
          <FormControlLabel
            control={<Switch size="small" checked={maintEnabled} color="warning"
              onChange={(e) => { setMaintEnabled(e.target.checked); scheduleMaint(e.target.checked, maintMsg) }} />}
            label={<Typography variant="caption">{maintEnabled ? 'On' : 'Off'}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {maintEnabled && (
          <TextField size="small" fullWidth multiline minRows={3} maxRows={6}
            label="Message shown to clients when maintenance is active"
            placeholder="We are performing scheduled maintenance. Back online at 14:00 UTC."
            value={maintMsg}
            onChange={(e) => { setMaintMsg(e.target.value); scheduleMaint(maintEnabled, e.target.value) }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          When enabled, all requests get a 503 with this message. Useful for planned downtime.
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Availability days */}
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <IconClock size={18} />
          <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>Availability days</Typography>
          <SaveIndicator status={avSave} />
          <FormControlLabel
            control={<Switch size="small" checked={avEnabled} color="primary"
              onChange={(e) => { setAvEnabled(e.target.checked); saveAv(e.target.checked, avTz, avSchedule) }} />}
            label={<Typography variant="caption">{avEnabled ? 'On' : 'Off'}</Typography>}
            sx={{ mr: 0 }} />
        </Box>
        {avEnabled && (
          <Box>
            {/* Timezone */}
            <FormControl size="small" sx={{ minWidth: 200, mb: 1.5 }}>
              <InputLabel>Timezone</InputLabel>
              <Select value={avTz} label="Timezone"
                onChange={(e) => { setAvTz(e.target.value); saveAv(avEnabled, e.target.value, avSchedule) }}>
                {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Schedule entries */}
            <Box display="flex" flexDirection="column" gap={1} mb={1}>
              {avSchedule.map(entry => (
                <Box key={entry.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Day</InputLabel>
                    <Select value={entry.day} label="Day"
                      onChange={(e) => updateEntry(entry.id, 'day', Number(e.target.value))}>
                      {DAY_LABELS.map((label, i) => <MenuItem key={i} value={i}>{label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>From</InputLabel>
                    <Select value={entry.startHour} label="From"
                      onChange={(e) => updateEntry(entry.id, 'startHour', Number(e.target.value))}>
                      {hours.filter(h => h < entry.endHour).map(h => <MenuItem key={h} value={h}>{fmtHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary">–</Typography>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>To</InputLabel>
                    <Select value={entry.endHour} label="To"
                      onChange={(e) => updateEntry(entry.id, 'endHour', Number(e.target.value))}>
                      {hours.filter(h => h > entry.startHour).map(h => <MenuItem key={h} value={h}>{fmtHour(h)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <IconButton size="small" color="error" onClick={() => removeEntry(entry.id)}>
                    <IconX size={18} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button size="small" startIcon={<IconPlus size={18} />} onClick={addEntry}>
              Add entry
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Restrict AI access to specific days and hours. Requests outside the schedule return a 503 error.
        </Typography>
      </Box>
    </Paper>
  )
}
