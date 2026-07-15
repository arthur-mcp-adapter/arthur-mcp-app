import { useTranslation } from 'react-i18next'
import type { HealthEntry } from '../healthEntry.interface'

export function useHealthStatusText() {
  const { t } = useTranslation('dashboard')
  return (h: HealthEntry): string => {
    if (h.isPaused) return t('healthStatus.paused')
    if (h.totalCalls === 0) return t('healthStatus.noActivity')
    if (h.errorRatePct === 0) return t('healthStatus.allSucceeded', { count: h.totalCalls })
    return t('healthStatus.errorRate', { count: h.totalCalls, rate: h.errorRatePct })
  }
}
