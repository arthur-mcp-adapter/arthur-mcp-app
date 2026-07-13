import { Box, Typography } from '@mui/material'
import { IconShieldCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { AuthConfig, GeneratedTool } from '../../types'
import { AuthConfigPanel } from '../../settings/AuthConfigPanel'
import { InputConstraintsPanel } from '../InputConstraintsPanel'
import { OutputFilteringPanel } from '../OutputFilteringPanel'
import { ToolRestrictionsPanel } from '../ToolRestrictionsPanel'
import type { GuardRailsTabProps } from './guardRailsTabProps.interface'


export function GuardRailsTab({ projectId, tools, initialAuth, onAuthChange }: GuardRailsTabProps) {
  const { t } = useTranslation('serverDetail')

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>
          <IconShieldCheck size={22} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>{t('guardRails.title')}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {t('guardRails.subtitle')}
          </Typography>
        </Box>
      </Box>

      <AuthConfigPanel
        projectId={projectId}
        initialAuth={initialAuth}
        onChange={onAuthChange}
      />
      <InputConstraintsPanel projectId={projectId} tools={tools} />
      <OutputFilteringPanel projectId={projectId} tools={tools} />
      <ToolRestrictionsPanel projectId={projectId} tools={tools} />
    </Box>
  )
}
