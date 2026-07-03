export function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

export function isEmptyObject(value?: Record<string, unknown>) {
  return !value || Object.keys(value).length === 0
}

/** Formats a past Date as a short relative label ("5m", "3h"), falling back to a locale date past 24h. */
export function formatTestedAt(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return '0m'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return date.toLocaleDateString()
}
