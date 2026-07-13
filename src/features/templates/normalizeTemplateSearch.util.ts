export function normalizeTemplateSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
