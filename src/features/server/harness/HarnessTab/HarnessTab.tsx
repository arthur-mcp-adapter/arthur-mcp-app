import { Box, Typography } from '@mui/material'
import { IconTestPipe } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { GeneratedTool } from '../../types'
import { RateLimitPanel } from '../../settings/RateLimitPanel'
import { RetryPolicyPanel } from '../RetryPolicyPanel'
import { TimeoutPanel } from '../TimeoutPanel'
import { ExecutionHooksPanel } from '../ExecutionHooksPanel'
import type { HarnessTabProps } from './harnessTabProps.interface'


export function HarnessTab({ projectId, tools }: HarnessTabProps) {
  const { t } = useTranslation('serverDetail')

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>
          <IconTestPipe size={22} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>{t('harness.title')}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {t('harness.subtitle')}
          </Typography>
        </Box>
      </Box>

      <RateLimitPanel />
      <RetryPolicyPanel projectId={projectId} />
      <TimeoutPanel projectId={projectId} tools={tools} />
      <ExecutionHooksPanel projectId={projectId} />
    </Box>
  )
}
