export interface EditorTabProps {
  content: string
  onContentChange: (v: string) => void
  onSave: () => void
  dirty: boolean
  saving: boolean
}
