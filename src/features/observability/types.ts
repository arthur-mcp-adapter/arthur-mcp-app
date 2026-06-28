export type ObservabilityProviderType = 'grafana' | 'prometheus' | 'datadog' | 'newrelic' | 'elastic' | 'loki' | 'custom'

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
