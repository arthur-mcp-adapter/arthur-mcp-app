export function isEmptyObject(value?: Record<string, unknown>) {
  return !value || Object.keys(value).length === 0
}
