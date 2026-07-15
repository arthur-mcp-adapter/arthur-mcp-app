import type { EndpointStatus } from './endpointStatus.type'

export interface EndpointCheck {
  path: string
  labelKey: string
  status: EndpointStatus
  latencyMs?: number
  statusCode?: number
  detail?: string
}
