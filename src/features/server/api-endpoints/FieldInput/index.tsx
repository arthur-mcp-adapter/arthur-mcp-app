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
import type { JsonSchema } from '../../types'

interface FieldInputProps {
  name: string
  schema: JsonSchema
  value: string
  required: boolean
  onChange: (value: string) => void
}

export function FieldInput({ name, schema, value, required, onChange }: FieldInputProps) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum?.length) {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} label={label} onChange={(e) => onChange(String(e.target.value))}>
          {schema.enum.map((v) => <MenuItem key={String(v)} value={String(v)}>{String(v)}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }
  if (schema.type === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} size="small" />}
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
      onChange={(e) => onChange(e.target.value)}
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
