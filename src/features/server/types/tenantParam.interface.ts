import type { TenantParamType } from './tenantParamType.type'

export interface TenantParam {
  name: string
  type: TenantParamType
  description?: string
  required?: boolean
}
