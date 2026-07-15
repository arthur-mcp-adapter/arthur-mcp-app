export function formatEnvironmentValue(value: string): string {
  return value === '' ? '""' : value
}
