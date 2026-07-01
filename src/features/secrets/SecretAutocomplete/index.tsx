import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { IconShieldLock } from '@tabler/icons-react'
import api from '../../../api'

export interface SecretEntry {
  id: string
  name: string
  description?: string
}

export function useSecrets() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<SecretEntry[]>('/secrets')
      .then((r) => setSecrets(r.data))
      .finally(() => setLoading(false))
  }, [])

  return { secrets, loading }
}

export default function SecretAutocomplete({ value, onChange, label, secrets, loadingSecrets, disabled }: {
  value: string
  onChange: (v: string) => void
  label: string
  secrets: SecretEntry[]
  loadingSecrets: boolean
  disabled?: boolean
}) {
  const options = secrets.map((s) => `{{secret:${s.name}}}`)
  const isSecretRef = value.startsWith('{{secret:')
  const selectedName = isSecretRef ? value.replace(/^\{\{secret:/, '').replace(/\}\}$/, '') : null

  return (
    <Autocomplete
      options={options}
      value={isSecretRef ? value : null}
      loading={loadingSecrets}
      disabled={disabled}
      onChange={(_, newVal) => onChange(newVal ?? '')}
      getOptionLabel={(opt) => opt.replace(/^\{\{secret:/, '').replace(/\}\}$/, '')}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.toLowerCase()
        return opts.filter((opt) =>
          opt.replace(/^\{\{secret:/, '').replace(/\}\}$/, '').toLowerCase().includes(q)
        )
      }}
      noOptionsText={loadingSecrets ? 'Loading…' : 'No secrets found — add one in Secrets vault'}
      renderOption={(props, option) => {
        const name = option.replace(/^\{\{secret:/, '').replace(/\}\}$/, '')
        const secret = secrets.find((s) => s.name === name)
        return (
          <Box component="li" {...props} key={option}>
            <Box display="flex" alignItems="center" gap={1}>
              <IconShieldLock size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              <Box>
                <Typography fontSize="0.82rem" fontFamily="monospace" fontWeight={600}>{name}</Typography>
                {secret?.description && (
                  <Typography fontSize="0.72rem" color="text.secondary" lineHeight={1.3}>{secret.description}</Typography>
                )}
              </Box>
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          InputProps={{
            ...params.InputProps,
            startAdornment: selectedName ? (
              <InputAdornment position="start">
                <IconShieldLock size={14} style={{ opacity: 0.7 }} />
              </InputAdornment>
            ) : undefined,
            endAdornment: (
              <>
                {loadingSecrets && <CircularProgress size={14} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          helperText={
            selectedName
              ? `{{secret:${selectedName}}}`
              : 'Select a secret from the vault'
          }
          FormHelperTextProps={{
            sx: { fontFamily: selectedName ? 'monospace' : undefined, fontSize: '0.7rem' },
          }}
        />
      )}
    />
  )
}
