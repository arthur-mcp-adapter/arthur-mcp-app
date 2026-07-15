import type { TenantParamType } from '../../../types'

export const TENANT_PARAM_TYPES: { value: TenantParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number (float)' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'uuid', label: 'UUID' },
  { value: 'hash', label: 'Hash' },
]
