import type { HbScalar } from '../../../types'
import type { HbArray } from '../../../types'

export function extractHbSchema(root: unknown, prefix = '', depth = 0): { scalars: HbScalar[]; arrays: HbArray[] } {
  const scalars: HbScalar[] = []
  const arrays: HbArray[] = []
  if (root == null || typeof root !== 'object' || Array.isArray(root) || depth > 3) return { scalars, arrays }
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (Array.isArray(v)) {
      const itemScalars: string[] = []
      if (v.length > 0 && v[0] != null && typeof v[0] === 'object') {
        extractHbSchema(v[0], '', 0).scalars.forEach((s) => itemScalars.push(s.path))
      }
      arrays.push({ path, length: v.length, itemScalars })
    } else if (v !== null && typeof v === 'object') {
      const nested = extractHbSchema(v, path, depth + 1)
      scalars.push(...nested.scalars)
      arrays.push(...nested.arrays)
    } else {
      scalars.push({ path, sample: v == null ? '' : String(v).slice(0, 120) })
    }
  }
  return { scalars, arrays }
}
