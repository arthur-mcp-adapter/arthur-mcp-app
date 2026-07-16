import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconActivity,
  IconCheck,
  IconClipboard,
  IconDeviceFloppy,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { Permission, useAuth } from '../../../context/auth'
import {
  defaultEnvironmentValues,
  formatEnvironmentValue,
  mergeEnvironmentValues,
  serializeEnvironmentValues,
} from '../utils'
import { ENVIRONMENT_CONTROLS } from '../environmentControls.constant'
import type { SettingsResponse } from './settingsResponse.interface'
import type { CopyButtonProps } from './copyButtonProps.interface'



function CopyButton({ value, label }: CopyButtonProps) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Tooltip title={copied ? t('action.copied') : label}>
      <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
        {copied ? <IconCheck size={15} /> : <IconClipboard size={15} />}
      </IconButton>
    </Tooltip>
  )
}

export function ObservabilityEnvironmentPanel() {
  const { t } = useTranslation(['observability', 'common', 'settings'])
  const { can } = useAuth()
  const canManageSettings = can(Permission.SettingsManage)

  const [environmentValues, setEnvironmentValues] = useState<Record<string, string>>(defaultEnvironmentValues)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState('')
  const [configSavedAt, setConfigSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    setConfigLoading(true)
    setConfigSavedAt(null)
    api.get<SettingsResponse>('/settings')
      .then((response) => {
        setEnvironmentValues(mergeEnvironmentValues(response.data.observabilityEnvironment))
        setConfigError('')
      })
      .catch(() => setConfigError(t('observability:error.environmentLoadFailed')))
      .finally(() => setConfigLoading(false))
  }, [t])

  const setEnvironmentValue = (name: string, value: string) => {
    setEnvironmentValues((current) => ({ ...current, [name]: value }))
    setConfigSavedAt(null)
  }

  const resetEnvironmentValues = () => {
    setEnvironmentValues(defaultEnvironmentValues())
    setConfigSavedAt(null)
  }

  const saveEnvironmentValues = async () => {
    setConfigSaving(true)
    setConfigError('')
    try {
      await api.patch('/settings', { observabilityEnvironment: environmentValues })
      setConfigSavedAt(new Date())
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            t('observability:error.environmentSaveFailed')
          : t('observability:error.environmentSaveFailed')
      setConfigError(msg)
    } finally {
      setConfigSaving(false)
    }
  }

  const disabled = !canManageSettings || configSaving

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>
            <IconActivity size={18} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('observability:heading.title')}
          </Typography>
        </Box>

        {configError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {configError}
          </Alert>
        )}
        {!canManageSettings && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('observability:hint.environmentReadOnly')}
          </Alert>
        )}

        {configLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {ENVIRONMENT_CONTROLS.map((control) => (
              <Grid item xs={12} sm={6} key={control.name}>
                {control.kind === 'boolean' ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px',
                      px: 1.75,
                      py: '8.5px',
                    }}
                  >
                    <FormControlLabel
                      labelPlacement="start"
                      sx={{ flexGrow: 1, m: 0, justifyContent: 'space-between' }}
                      label={
                        <Typography fontFamily="monospace" fontSize="0.82rem">
                          {control.name}
                        </Typography>
                      }
                      control={
                        <Switch
                          size="small"
                          checked={environmentValues[control.name] === 'true'}
                          onChange={(event) => setEnvironmentValue(control.name, String(event.target.checked))}
                          disabled={disabled}
                        />
                      }
                    />
                  </Box>
                ) : control.kind === 'select' ? (
                  <FormControl size="small" fullWidth disabled={disabled}>
                    <InputLabel
                      id={`${control.name}-label`}
                      sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                    >
                      {control.name}
                    </InputLabel>
                    <Select
                      labelId={`${control.name}-label`}
                      label={control.name}
                      value={environmentValues[control.name] ?? control.defaultValue}
                      onChange={(event) => setEnvironmentValue(control.name, event.target.value)}
                      sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                    >
                      {(control.options ?? []).map((option) => (
                        <MenuItem key={option} value={option} sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    size="small"
                    fullWidth
                    label={control.name}
                    value={environmentValues[control.name] ?? ''}
                    placeholder={formatEnvironmentValue(control.defaultValue) || undefined}
                    onChange={(event) => setEnvironmentValue(control.name, event.target.value)}
                    disabled={disabled}
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                    InputLabelProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Box display="flex" flexWrap="wrap" justifyContent="flex-end" alignItems="center" gap={1} mt={1} mb={3}>
        {configSavedAt && (
          <Typography variant="caption" color="success.main">
            {t('observability:runtime.saved', { time: configSavedAt.toLocaleTimeString() })}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center">
          <CopyButton value={serializeEnvironmentValues(environmentValues)} label={t('common:action.copy')} />
          <Button
            size="small"
            variant="text"
            onClick={resetEnvironmentValues}
            disabled={!canManageSettings || configLoading || configSaving}
          >
            {t('common:action.reset')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={configSaving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={18} />}
            onClick={saveEnvironmentValues}
            disabled={!canManageSettings || configLoading || configSaving}
          >
            {configSaving ? t('settings:saving') : t('settings:saveSettings')}
          </Button>
        </Stack>
      </Box>
    </>
  )
}
