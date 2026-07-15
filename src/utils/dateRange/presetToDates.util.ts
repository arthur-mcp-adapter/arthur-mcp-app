import type { Preset } from '../preset.type'

export function presetToDates(preset: Preset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = new Date()
  if (preset === '24h') return { from: new Date(to.getTime() - 24 * 60 * 60 * 1000), to }
  if (preset === '7d') return { from: new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000), to }
  if (preset === '30d') return { from: new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000), to }
  const from = customFrom ? new Date(customFrom) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
  const toCustom = customTo ? new Date(customTo + 'T23:59:59') : to
  return { from, to: toCustom }
}
