export function isValidUrl(u: string) {
  try { new URL(u); return true } catch { return false }
}

export function emailValid(v: string) {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function portValid(v: number) {
  return v >= 1 && v <= 65535
}
