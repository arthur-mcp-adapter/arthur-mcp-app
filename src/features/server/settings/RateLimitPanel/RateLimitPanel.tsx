import {
  Box, FormControlLabel, Paper, Switch, TextField, Typography,
} from '@mui/material'
import { IconGauge } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { HelpButton } from '../../../../components'
import { FIXED_REQUESTS_PER_MINUTE } from './fixedRequestsPerMinute.constant'

export function RateLimitPanel() {
  const { t } = useTranslation('serverDetail')

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <IconGauge size={20} />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>{t('heading.requestLimit')}</Typography>
          <HelpButton title={t('heading.requestLimit')}>
            <Typography variant="body2" gutterBottom>
              {t('help.rateLimit.intro')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>{t('help.rateLimit.whyTitle')}</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.protectTitle')}</strong> {t('help.rateLimit.protectText')}</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.costTitle')}</strong> {t('help.rateLimit.costText')}</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.runawayTitle')}</strong> {t('help.rateLimit.runawayText')}</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>{t('help.rateLimit.fairTitle')}</strong> {t('help.rateLimit.fairText')}</Typography></Box>
            </Box>
            <Typography variant="body2">
              {t('help.rateLimit.toggleText')}
            </Typography>
          </HelpButton>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={<Switch size="small" checked disabled color="warning" />}
            label={<Typography variant="body2">{t('status.active')}</Typography>}
            sx={{ mr: 0 }}
          />
          <TextField
            size="small" type="number" label={t('label.reqPerMin')}
            value={FIXED_REQUESTS_PER_MINUTE} disabled
            sx={{ width: 130 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {t('hint.rateLimitActive', { rpm: FIXED_REQUESTS_PER_MINUTE })}
        </Typography>
      </Box>
    </Paper>
  )
}
