import { useEffect, useRef, useState } from 'react'
import {
  Box, CircularProgress, IconButton, TextField, Tooltip, Typography,
} from '@mui/material'
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react'
import type { InlineEditProps } from '../../types'

export function InlineEdit({
  value,
  onSave,
  readOnly = false,
  multiline = false,
  placeholder,
  emptyLabel = 'Add…',
  fontSize,
  fontWeight,
  color,
  fontFamily,
  maxWidth,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = async () => {
    if (saving) return
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  const cancel = () => { setDraft(value); setEditing(false) }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { cancel(); return }
    if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); return }
    if (multiline && e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commit(); return }
  }

  if (!editing) {
    if (readOnly) {
      return (
        <Typography sx={{ fontSize, fontWeight, color: value ? (color ?? 'text.primary') : 'text.disabled', fontFamily, lineHeight: 1.5, fontStyle: value ? 'normal' : 'italic', maxWidth }}>
          {value || emptyLabel}
        </Typography>
      )
    }
    return (
      <Box
        display="inline-flex"
        alignItems="flex-start"
        gap={0.5}
        onClick={() => setEditing(true)}
        sx={{
          cursor: 'text',
          maxWidth,
          borderBottom: '1px dashed transparent',
          transition: 'border-color 0.15s',
          '&:hover': {
            borderColor: 'divider',
            cursor: 'text',
            '& .edit-pencil': { opacity: 1 },
          },
        }}
      >
        {value ? (
          <Typography sx={{ fontSize, fontWeight, color: color ?? 'text.primary', fontFamily, lineHeight: 1.5 }}>{value}</Typography>
        ) : (
          <Typography sx={{ fontSize: fontSize ?? '0.875rem', color: 'text.disabled', fontStyle: 'italic' }}>{emptyLabel}</Typography>
        )}
        <Box
          className="edit-pencil"
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', opacity: 0.4, transition: 'opacity 0.15s', mt: '3px', flexShrink: 0, p: 0.25 }}
        >
          <IconEdit size={16} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth, width: '100%' }}>
      <TextField
        inputRef={inputRef}
        size="small"
        fullWidth
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        maxRows={multiline ? 10 : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={saving}
      />
      <Box display="flex" gap={0.5} mt={0.5} justifyContent="flex-end">
        <Tooltip title={multiline ? 'Save (Ctrl+Enter)' : 'Save (Enter)'}>
          <span>
            <IconButton size="small" color="primary" onClick={commit} disabled={saving}>
              {saving ? <CircularProgress size={13} /> : <IconCheck size={18} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel (Esc)">
          <IconButton size="small" onClick={cancel} disabled={saving}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
