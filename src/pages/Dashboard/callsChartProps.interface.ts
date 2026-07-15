import type { DashStats } from './dashStats.interface'
import type { Preset } from '../../utils/dateRange'

export interface CallsChartProps { data: DashStats['callsByBucket']; preset: Preset }
