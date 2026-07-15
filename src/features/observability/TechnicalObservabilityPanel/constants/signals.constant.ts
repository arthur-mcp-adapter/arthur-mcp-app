import { IconChartHistogram } from '@tabler/icons-react'
import { IconActivity } from '@tabler/icons-react'

export const SIGNALS = [
  { icon: IconChartHistogram, key: 'metrics', color: 'success.main' },
  { icon: IconActivity, key: 'correlation', color: 'warning.main' },
] as const
