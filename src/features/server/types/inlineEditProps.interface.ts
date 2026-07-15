export interface InlineEditProps {
  value: string
  onSave: (v: string) => Promise<void>
  readOnly?: boolean
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  fontSize?: string | number
  fontWeight?: number
  color?: string
  fontFamily?: string
  maxWidth?: number | string
}
