import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { FieldInputProps } from './fieldInputProps.interface'

export function FieldInput({ name, schema, value, required, onChange }: FieldInputProps) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum?.length) {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} label={label} onChange={(event) => onChange(String(event.target.value))}>
          {schema.enum.map((entry) => <MenuItem key={String(entry)} value={String(entry)}>{String(entry)}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }
  if (schema.type === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true'} onChange={(event) => onChange(String(event.target.checked))} size="small" />}
        label={<Typography variant="body2">{label}</Typography>}
      />
    )
  }
  const isJson = schema.type === 'object' || schema.type === 'array'
  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      helperText={schema.description}
      type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
      multiline={isJson}
      minRows={isJson ? 6 : 1}
      maxRows={isJson ? 16 : 4}
      InputProps={isJson ? { sx: { fontFamily: 'monospace', fontSize: '0.82rem' } } : undefined}
      placeholder={schema.type === 'object' ? '{"key":"value"}' : schema.type === 'array' ? '["item1"]' : undefined}
    />
  )
}
