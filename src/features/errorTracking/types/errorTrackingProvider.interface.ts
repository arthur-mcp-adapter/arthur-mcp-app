import type { ErrorTrackingToolType } from './errorTrackingToolType.type'

export interface ErrorTrackingProvider {
  id: string
  name: string
  description?: string
  tool: ErrorTrackingToolType
  dsn: string
  projectName?: string
  environment?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
