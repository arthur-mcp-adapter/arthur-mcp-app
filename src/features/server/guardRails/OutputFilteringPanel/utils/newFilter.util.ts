import type { OutputFilter } from '../outputFilter.interface'

export function newFilter(): OutputFilter {
  return { id: crypto.randomUUID(), type: 'mask_field', target: '', replacement: '*****', toolName: '*', enabled: true }
}
