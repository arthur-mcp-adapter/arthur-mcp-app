import type { ResponseConfig } from './responseConfig.interface'

export interface ResponseLimitPanelProps {
  projectId: string
  initialConfig?: ResponseConfig
  onChange: (cfg: ResponseConfig) => void
}
