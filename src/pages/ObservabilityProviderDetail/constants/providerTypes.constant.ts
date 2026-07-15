import type { ObservabilityProviderType } from '../../../features/observability'

export const PROVIDER_TYPES: ObservabilityProviderType[] = [
  'grafana', 'prometheus', 'datadog', 'newrelic', 'elastic', 'loki', 'custom',
]
