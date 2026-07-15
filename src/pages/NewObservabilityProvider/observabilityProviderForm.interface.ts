import type { ObservabilityProviderType } from '../../features/observability'

export interface ObservabilityProviderForm {
  name: string
  description: string
  type: ObservabilityProviderType
  url: string
  apiKey: string
}
