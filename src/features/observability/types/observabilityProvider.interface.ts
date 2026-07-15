import type { ObservabilityProviderType } from './observabilityProviderType.type'

export interface ObservabilityProvider {
  id: string
  name: string
  description?: string
  type: ObservabilityProviderType
  url: string
  apiKey?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
