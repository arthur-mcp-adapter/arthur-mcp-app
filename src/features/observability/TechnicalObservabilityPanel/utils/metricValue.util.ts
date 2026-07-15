export function metricValue(metrics: string, name: string): number | undefined {
  const line = metrics.split('\n').find((entry) => entry.startsWith(name))
  if (!line) return undefined
  const parts = line.trim().split(/\s+/)
  const value = Number(parts[parts.length - 1])
  return Number.isFinite(value) ? value : undefined
}
