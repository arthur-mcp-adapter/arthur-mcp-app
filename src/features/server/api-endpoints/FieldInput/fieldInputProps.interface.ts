import type { JsonSchema } from '../../types'

export interface FieldInputProps {
  name: string
  schema: JsonSchema
  value: string
  required: boolean
  onChange: (value: string) => void
}
