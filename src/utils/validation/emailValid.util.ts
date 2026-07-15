export function emailValid(v: string) {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
