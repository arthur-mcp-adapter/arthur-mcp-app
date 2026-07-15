import { KeyboardEvent, useState } from 'react'
import { Box, Chip, InputAdornment, TextField } from '@mui/material'
import { IconTag, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { TagInputProps } from './tagInputProps.interface'


export function TagInput({ tags, onChange }: TagInputProps) {
  const { t } = useTranslation('prompts')
  const [inputValue, setInputValue] = useState('')

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length) onChange(tags.slice(0, -1))
  }

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={tags.length ? 0.75 : 0}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onDelete={() => onChange(tags.filter((currentTag) => currentTag !== tag))}
            deleteIcon={<IconX size={12} />}
            sx={{ fontSize: '0.72rem', height: 22 }}
          />
        ))}
      </Box>
      <TextField
        size="small"
        fullWidth
        placeholder={t('placeholder.addTag')}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><IconTag size={15} /></InputAdornment>,
        }}
      />
    </Box>
  )
}