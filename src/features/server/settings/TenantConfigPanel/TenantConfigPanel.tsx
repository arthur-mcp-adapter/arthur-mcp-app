import { useRef, useState } from 'react'
import {
  Autocomplete,
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
import { IconDatabase, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../../api'
import { SaveIndicator } from '../../../../components'
import type { SaveStatus, TenantParam, TenantParamType } from '../../types'
import type { TenantConfigPanelProps } from './tenantConfigPanelProps.interface'
import { TENANT_PARAM_TYPES } from './constants/tenantParamTypes.constant'



export function TenantConfigPanel({ projectId, mcpServerIdentifier, initialConfig, toolParamSuggestions }: TenantConfigPanelProps) {
  const { t } = useTranslation('serverDetail')
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [params, setParams] = useState<TenantParam[]>(initialConfig?.params ?? [])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (en: boolean, nextParams: TenantParam[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/servers/${projectId}/tenant-config`, { enabled: en, params: nextParams })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const addParam = () => {
    const next = [...params, { name: '', type: 'string' as TenantParamType, description: '', required: false }]
    setParams(next)
    scheduleSave(enabled, next)
  }

  const updateParam = (idx: number, patch: Partial<TenantParam>) => {
    const next = params.map((param, index) => index === idx ? { ...param, ...patch } : param)
    setParams(next)
    scheduleSave(enabled, next)
  }

  const removeParam = (idx: number) => {
    const next = params.filter((_, index) => index !== idx)
    setParams(next)
    scheduleSave(enabled, next)
  }

  const mcpUrl = `${window.location.origin}/api/mcp/server/${mcpServerIdentifier}`
  const previewUrl = params.filter((param) => param.name.trim()).length > 0
    ? `${mcpUrl}?${params.filter((param) => param.name.trim()).map((param) => `${param.name}={value}`).join('&')}`
    : null

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={enabled ? 2 : 0}>
        <IconDatabase size={18} />
        <Box flexGrow={1}>
          <Typography variant="subtitle2" fontWeight={700}>{t('heading.multiTenantParams')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('hint.tenantParamInject')}
          </Typography>
        </Box>
        <SaveIndicator status={saveStatus} />
        <FormControlLabel
          control={<Switch size="small" checked={enabled} color="primary"
            onChange={(e) => { setEnabled(e.target.checked); scheduleSave(e.target.checked, params) }} />}
          label={<Typography variant="caption">{enabled ? t('status.on') : t('status.off')}</Typography>}
          sx={{ mr: 0 }} />
      </Box>

      {enabled && (
        <Box>
          {params.map((param, idx) => (
            <Box key={idx} display="flex" gap={1} alignItems="flex-start" mb={1.5}>
              <Autocomplete
                freeSolo
                size="small"
                sx={{ flex: 2 }}
                options={toolParamSuggestions}
                value={param.name}
                onInputChange={(_, value) => updateParam(idx, { name: value })}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Typography variant="body2" fontFamily="monospace">{option}</Typography>
                  </li>
                )}
                renderInput={(inputProps) => (
                  <TextField {...inputProps} label={t('label.parameterName')} placeholder="customerId" />
                )}
              />
              <FormControl size="small" sx={{ flex: 1.5 }}>
                <InputLabel>{t('schema.type')}</InputLabel>
                <Select
                  label={t('schema.type')}
                  value={param.type}
                  onChange={(e) => updateParam(idx, { type: e.target.value as TenantParamType })}
                >
                  {TENANT_PARAM_TYPES.map((typeOption) => (
                    <MenuItem key={typeOption.value} value={typeOption.value}>{typeOption.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label={t('label.descriptionOptional')} placeholder={t('placeholder.customerIdExample')}
                value={param.description ?? ''}
                onChange={(e) => updateParam(idx, { description: e.target.value })}
                sx={{ flex: 3 }}
              />
              <Tooltip title={param.required ? t('tooltip.tenantRequired') : t('tooltip.tenantOptional')}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={param.required ?? false}
                      onChange={(e) => updateParam(idx, { required: e.target.checked })}
                      color="error"
                    />
                  }
                  label={<Typography variant="caption" color={param.required ? 'error' : 'text.secondary'}>
                    {param.required ? t('label.required') : t('label.optional')}
                  </Typography>}
                  sx={{ mr: 0, flexShrink: 0 }}
                />
              </Tooltip>
              <Tooltip title={t('action.remove')}>
                <IconButton size="small" color="error" onClick={() => removeParam(idx)} sx={{ mt: 0.5 }}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={addParam} sx={{ mb: 2 }}>
            {t('action.addParameter')}
          </Button>

          {previewUrl && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.25} fontWeight={600}>
                {t('label.exampleTenantUrl')}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {previewUrl}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            {t('hint.tenantHint')}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}
