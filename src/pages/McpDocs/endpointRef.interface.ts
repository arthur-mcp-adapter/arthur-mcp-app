import type { ParameterMapping } from './parameterMapping.interface'

export interface EndpointRef {
  method: string
  path: string
  baseUrl: string
  contentType?: string
  parameterMap: ParameterMapping[]
}
