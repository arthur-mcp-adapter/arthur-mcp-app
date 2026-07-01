import { Alert, Box } from '@mui/material'
import { Permission, useAuth } from '../../context/AuthContext'
import { TechnicalObservabilityPanel } from '../../features/observability'
import { useTranslation } from 'react-i18next'

export default function Observability() {
  const { t } = useTranslation('observability')
  const { can } = useAuth()

  if (!can(Permission.ObservabilityView)) {
    return (
      <Box>
        <Alert severity="warning">{t('restricted.view')}</Alert>
      </Box>
    )
  }

  return (
    <TechnicalObservabilityPanel />
  )
}
