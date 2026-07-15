import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { IconHttpConnect, IconPlus, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { HelpButton } from '../../../components'
import type { HeaderEntry } from './headerEntry.interface'
import type { GlobalRequestHeadersPanelProps } from './globalRequestHeadersPanelProps.interface'



export function GlobalRequestHeadersPanel({
  globalHeaders,
  onAdd,
  onRemove,
  onChange,
}: GlobalRequestHeadersPanelProps) {
  const { t } = useTranslation('settings')

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}><IconHttpConnect size={18} /></Box>
        <Typography variant="subtitle1" fontWeight={700}>{t('headers.title')}</Typography>
        <HelpButton title={t('headers.helpTitle')}>
          <Typography variant="body2">{t('headers.helpBody')}</Typography>
        </HelpButton>
      </Box>

      {globalHeaders.length === 0 ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, py: 2.5, textAlign: 'center', mb: 1.5 }}>
          <Typography variant="body2" color="text.disabled">
            {t('headers.empty')}
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
          {globalHeaders.map((header) => (
            <Box key={header.id} display="flex" alignItems="center" gap={1}>
              <TextField
                size="small" placeholder={t('headers.placeholderName')} value={header.name}
                onChange={(e) => onChange(header.id, 'name', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{null}</InputAdornment>,
                  sx: { fontFamily: 'monospace', fontSize: '0.82rem' },
                }}
                sx={{ width: 220, flexShrink: 0 }}
              />
              <TextField
                size="small" fullWidth placeholder={t('headers.placeholderValue')} value={header.value}
                onChange={(e) => onChange(header.id, 'value', e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
              <Tooltip title={t('headers.removeTooltip')}>
                <IconButton size="small" color="error" onClick={() => onRemove(header.id)}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={onAdd}>
        {t('headers.addHeader')}
      </Button>
    </Paper>
  )
}
