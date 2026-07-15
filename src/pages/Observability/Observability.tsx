import { Alert, Box } from '@mui/material'
import { Permission, useAuth } from '../../context/auth'
import { TechnicalObservabilityPanel } from '../../features/observability'
import { useTranslation } from 'react-i18next'

export default function Observability() {
  const { t } = useTranslation('observability')
  const { can, selfHosted } = useAuth()

  if (!can(Permission.ObservabilityView)) {
    return (
      <Box>
        <Alert severity="warning">{t('restricted.view')}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      {!selfHosted && <Alert severity="info" sx={{ mb: 3 }}>{t('hint.selfHostedOnly')}</Alert>}
      <TechnicalObservabilityPanel />
    </Box>
  )
}
