export function metricSum(metrics: string, name: string): number {
  return metrics
    .split('\n')
    .filter((line) => line.startsWith(name) && !line.startsWith(`${name}_bucket`))
    .reduce((sum, line) => {
      const parts = line.trim().split(/\s+/)
      const value = Number(parts[parts.length - 1])
      return Number.isFinite(value) ? sum + value : sum
    }, 0)
}
