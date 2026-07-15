export function shellSingleQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
