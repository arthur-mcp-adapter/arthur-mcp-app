export function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}
