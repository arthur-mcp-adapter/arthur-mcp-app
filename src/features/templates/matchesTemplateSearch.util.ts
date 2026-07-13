import { normalizeTemplateSearch } from './normalizeTemplateSearch.util'

export function matchesTemplateSearch(query: string, fields: string[]): boolean {
  const tokens = normalizeTemplateSearch(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return true

  const searchableText = normalizeTemplateSearch(fields.join(' '))
  return tokens.every((token) => searchableText.includes(token))
}
