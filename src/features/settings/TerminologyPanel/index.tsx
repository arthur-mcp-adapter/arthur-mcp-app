import {
  Box,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { IconLetterCase } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { HelpButton } from '../../../components'

export function TerminologyPanel({
  termServer,
  termTool,
  termResource,
  termPrompt,
  termChain,
  termSecret,
  onTermServerChange,
  onTermToolChange,
  onTermResourceChange,
  onTermPromptChange,
  onTermChainChange,
  onTermSecretChange,
}: {
  termServer: string
  termTool: string
  termResource: string
  termPrompt: string
  termChain: string
  termSecret: string
  onTermServerChange: (value: string) => void
  onTermToolChange: (value: string) => void
  onTermResourceChange: (value: string) => void
  onTermPromptChange: (value: string) => void
  onTermChainChange: (value: string) => void
  onTermSecretChange: (value: string) => void
}) {
  const { t } = useTranslation('settings')

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}><IconLetterCase size={18} /></Box>
        <Typography variant="subtitle1" fontWeight={700}>{t('terminology.title')}</Typography>
        <HelpButton title={t('terminology.helpTitle')}>
          <Typography variant="body2">{t('terminology.helpBody')}</Typography>
        </HelpButton>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.serverLabel')} placeholder="Server" value={termServer} onChange={(e) => onTermServerChange(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.toolLabel')} placeholder="Tool" value={termTool} onChange={(e) => onTermToolChange(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.resourceLabel')} placeholder="Resource" value={termResource} onChange={(e) => onTermResourceChange(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.promptLabel')} placeholder="Prompt" value={termPrompt} onChange={(e) => onTermPromptChange(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.chainLabel')} placeholder="Chain" value={termChain} onChange={(e) => onTermChainChange(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField size="small" fullWidth label={t('terminology.secretLabel')} placeholder="Secret" value={termSecret} onChange={(e) => onTermSecretChange(e.target.value)} />
        </Grid>
      </Grid>
    </Paper>
  )
}
