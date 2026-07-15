import type { JsonSchema } from './jsonSchema.interface'

export interface FieldInputProps {
  name: string; schema: JsonSchema; value: string; required: boolean; onChange: (v: string) => void
}
