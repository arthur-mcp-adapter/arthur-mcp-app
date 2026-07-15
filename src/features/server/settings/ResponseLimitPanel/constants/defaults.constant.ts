import type { ResponseConfig } from '../../../types'

export const DEFAULTS: Required<Omit<ResponseConfig, 'enabled'>> = {
  maxResponseLen: 100000,
  maxDepth: 5,
  arraySlice: 20,
  errorTruncateLen: 2000,
}
