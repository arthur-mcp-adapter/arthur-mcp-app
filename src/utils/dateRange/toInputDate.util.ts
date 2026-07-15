export function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
