import type { EndpointCheck } from '../endpointCheck.interface'

export const ENDPOINTS: Array<Pick<EndpointCheck, 'path' | 'labelKey'>> = [
  { path: '/health', labelKey: 'runtime.health' },
  { path: '/ready', labelKey: 'runtime.ready' },
  { path: '/live', labelKey: 'runtime.live' },
  { path: '/metrics', labelKey: 'runtime.metrics' },
]
